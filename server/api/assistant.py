
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database import get_db
from models import HandoffRequest
from schemas.assistant import (
    AssistantChatRequest,
    AssistantChatResponse,
)
from services.assistant_service import generate_reply
from services.email_service import send_handoff_notification
from services.lead_service import get_lead_by_id


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/assistant",
    tags=["AI Assistant"],
)


# ============================================================
# LOCALIZED HANDOFF CONFIRMATION
# ============================================================

HANDOFF_CONFIRMATION_MESSAGES = {
    "en": (
        "Your request for assistance has been saved for sales-team "
        "review. A sales representative can review it and follow up "
        "if appropriate. A callback is not guaranteed. Contact details "
        "are shared only when you have consented to being contacted."
    ),
    "hi": (
        "आपकी सहायता संबंधी अनुरोध को सेल्स टीम की समीक्षा के लिए "
        "सहेज लिया गया है। सेल्स प्रतिनिधि इसकी समीक्षा करके उचित "
        "होने पर आपसे संपर्क कर सकता है। कॉल आने की गारंटी नहीं है। "
        "संपर्क विवरण तभी साझा किए जाते हैं जब आपने संपर्क किए जाने "
        "की सहमति दी हो।"
    ),
    "gu": (
        "તમારી મદદ માટેની વિનંતી સેલ્સ ટીમની સમીક્ષા માટે સાચવી "
        "લેવામાં આવી છે. સેલ્સ પ્રતિનિધિ તેની સમીક્ષા કરીને યોગ્ય "
        "હોય તો તમારો સંપર્ક કરી શકે છે. ફોન આવવાની ખાતરી નથી. "
        "સંપર્ક વિગતો ફક્ત તમારી સંમતિ હોય ત્યારે જ શેર કરવામાં આવે છે."
    ),
}


def _language_code(language: str | None) -> str:
    """Normalize language codes such as hi-IN and gu-IN."""
    if not isinstance(language, str) or not language.strip():
        return "en"

    code = language.strip().lower().replace("_", "-").split("-")[0]

    if code not in HANDOFF_CONFIRMATION_MESSAGES:
        return "en"

    return code


# ============================================================
# LEAD CONTEXT
# ============================================================

def _build_lead_context(
    lead: dict | None,
    payload: AssistantChatRequest,
    consent_given: bool,
) -> dict:
    """
    Build a consistent context for the assistant.

    Existing lead data takes precedence when present. Consent is
    passed explicitly so the assistant can respect the user's choice.
    """
    return {
        "lead_id": lead.get("id") if lead else None,
        "name": (
            (lead.get("name") if lead else None)
            or payload.name
        ),
        "project": (
            (lead.get("project") if lead else None)
            or payload.project
        ),
        "bhk": (
            (lead.get("bhk") if lead else None)
            or payload.bhk
        ),
        "budget": (
            (lead.get("budget") if lead else None)
            or payload.budget
        ),
        "consent": consent_given,
    }


# ============================================================
# API ENDPOINT
# ============================================================

@router.post(
    "/chat",
    response_model=AssistantChatResponse,
    status_code=200,
    summary="Chat with EstateMate AI",
    description=(
        "Answers property enquiries using approved project facts "
        "and verified database listings. Supports requests for "
        "human assistance."
    ),
)
def chat(
    payload: AssistantChatRequest,
    db: Session = Depends(get_db),
) -> AssistantChatResponse:

    # --------------------------------------------------------
    # 1. Retrieve an existing lead, if a lead ID was supplied.
    # --------------------------------------------------------

    lead = None

    if payload.lead_id:
        try:
            lead = get_lead_by_id(payload.lead_id, db)

        except SQLAlchemyError:
            logger.exception(
                "Database error while retrieving assistant lead."
            )

            raise HTTPException(
                status_code=500,
                detail="Unable to retrieve lead information.",
            ) from None

        if lead is None:
            raise HTTPException(
                status_code=404,
                detail="Lead not found.",
            )

    # --------------------------------------------------------
    # 2. Determine consent and construct buyer context.
    # --------------------------------------------------------

    # Existing lead consent takes precedence when a lead exists.
    # Do not allow a request payload to override recorded consent.
    if lead is not None:
        consent_given = bool(lead.get("consent"))
    else:
        consent_given = bool(payload.consent)

    context = _build_lead_context(
        lead=lead,
        payload=payload,
        consent_given=consent_given,
    )

    # --------------------------------------------------------
    # 3. Generate the assistant response.
    # --------------------------------------------------------

    try:
        history = [
            item.model_dump()
            for item in payload.history[-10:]
        ]

        reply, handoff_required, handoff_reason = generate_reply(
            message=payload.message,
            language=payload.language,
            history=history,
            lead_context=context,
            db=db,
        )

    except HTTPException:
        raise

    except Exception:
        logger.exception(
            "Unexpected EstateMate assistant API error."
        )

        raise HTTPException(
            status_code=500,
            detail="The assistant could not process your request.",
        ) from None

    handoff_id = None
    notification_status = "not_required"

    # --------------------------------------------------------
    # 4. Persist an explicit human handoff request.
    # --------------------------------------------------------

    if (
        handoff_required
        and handoff_reason == "buyer_requested_human"
    ):
        buyer_name = None
        buyer_phone = None

        # Store contact details only if consent has been recorded.
        if consent_given:
            buyer_name = (
                (lead.get("name") if lead else None)
                or payload.name
            )

            buyer_phone = (
                (lead.get("phone") if lead else None)
                or payload.phone
            )

        handoff = HandoffRequest(
            lead_id=lead.get("id") if lead else None,
            reason="buyer_requested_human",
            status="pending",
            consent=consent_given,
            buyer_name=buyer_name,
            buyer_phone=buyer_phone,
            project=context.get("project"),
        )

        try:
            db.add(handoff)
            db.commit()
            db.refresh(handoff)

            handoff_id = handoff.id

            logger.info(
                "Human handoff saved successfully: %s",
                handoff_id,
            )

        except SQLAlchemyError:
            db.rollback()

            logger.exception(
                "Failed to persist human handoff request."
            )

            raise HTTPException(
                status_code=500,
                detail=(
                    "Your request was identified, but could not be "
                    "saved for sales-team review. Please try again "
                    "or contact the sales team directly."
                ),
            ) from None

        # ----------------------------------------------------
        # 5. Notify sales after the handoff has been committed.
        # ----------------------------------------------------

        try:
            send_handoff_notification(
                handoff_id=handoff_id,
                reason=handoff.reason,
                project=handoff.project,
                buyer_name=handoff.buyer_name,
                buyer_phone=handoff.buyer_phone,
                consent=handoff.consent,
            )

            # SMTP acceptance does not guarantee inbox delivery.
            notification_status = "accepted_by_smtp"

            logger.info(
                "SMTP accepted notification for handoff %s.",
                handoff_id,
            )

        except Exception:
            # Keep the database record even when email fails.
            notification_status = "failed"

            logger.exception(
                "Handoff %s was saved, but its email notification failed.",
                handoff_id,
            )

        # ----------------------------------------------------
        # 6. Return an accurate, localized confirmation.
        # ----------------------------------------------------

        language = _language_code(payload.language)
        reply = HANDOFF_CONFIRMATION_MESSAGES[language]

    # --------------------------------------------------------
    # 7. Return the existing API response schema.
    # --------------------------------------------------------

    return AssistantChatResponse(
        reply=reply,
        handoff_required=handoff_required,
        handoff_reason=handoff_reason,
        lead_id=lead.get("id") if lead else None,
        language=payload.language,
        handoff_id=handoff_id,
        notification_status=notification_status,
    )
