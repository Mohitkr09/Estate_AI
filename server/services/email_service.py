
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage

from dotenv import load_dotenv

# Load environment variables from the backend .env file.
load_dotenv()

logger = logging.getLogger(__name__)


def send_handoff_notification(
    *,
    handoff_id: str,
    reason: str,
    project: str | None,
    buyer_name: str | None,
    buyer_phone: str | None,
    consent: bool,
) -> None:
    """
    Send an EstateMate AI handoff notification through SMTP.

    Returns normally only when the SMTP server accepts the message.
    Raises an exception on configuration or SMTP failure.

    Note:
        SMTP acceptance does not guarantee delivery to the inbox.
        Buyer contact details are included only when consent is True.
    """

    # ---------------------------------------------------------
    # 1. Read SMTP configuration
    # ---------------------------------------------------------
    host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM_EMAIL", "").strip()
    to_email = os.getenv("SALES_TEAM_EMAIL", "").strip()

    try:
        port = int(os.getenv("SMTP_PORT", "465"))
    except ValueError as exc:
        raise RuntimeError(
            "SMTP_PORT must be a valid integer."
        ) from exc

    if not all(
        [host, username, password, from_email, to_email]
    ):
        raise RuntimeError(
            "SMTP is not fully configured. "
            "Check SMTP_HOST, SMTP_PORT, SMTP_USERNAME, "
            "SMTP_PASSWORD, SMTP_FROM_EMAIL, and SALES_TEAM_EMAIL "
            "in server/.env."
        )

    if not 1 <= port <= 65535:
        raise RuntimeError(
            "SMTP_PORT must be between 1 and 65535."
        )

    # ---------------------------------------------------------
    # 2. Build the notification email
    # ---------------------------------------------------------
    message = EmailMessage()
    message["Subject"] = (
        f"New EstateMate AI handoff: {handoff_id}"
    )
    message["From"] = from_email
    message["To"] = to_email

    details = [
        "A buyer has requested assistance from "
        "the EstateMate AI sales team.",
        "",
        f"Handoff reference: {handoff_id}",
        f"Reason: {reason}",
        f"Project: {project or 'Not specified'}",
        f"Buyer consent: {'Yes' if consent else 'No'}",
    ]

    # Include personal contact details only with recorded consent.
    if consent:
        details.extend(
            [
                f"Buyer name: {buyer_name or 'Not provided'}",
                f"Buyer phone: {buyer_phone or 'Not provided'}",
            ]
        )

    details.extend(
        [
            "",
            "Please review this request in the "
            "EstateMate AI dashboard.",
            "",
            "This email is a notification only. "
            "It does not mean the request has already been handled.",
        ]
    )

    message.set_content("\n".join(details))

    # ---------------------------------------------------------
    # 3. Connect using implicit SSL/TLS (Gmail port 465)
    # ---------------------------------------------------------
    context = ssl.create_default_context()

    try:
        with smtplib.SMTP_SSL(
            host=host,
            port=port,
            timeout=30,
            context=context,
        ) as server:
            server.login(username, password)
            server.send_message(message)

    except smtplib.SMTPAuthenticationError:
        logger.exception(
            "SMTP authentication failed for handoff %s.",
            handoff_id,
        )
        raise

    except (
        smtplib.SMTPConnectError,
        smtplib.SMTPServerDisconnected,
        smtplib.SMTPRecipientsRefused,
        smtplib.SMTPResponseException,
        TimeoutError,
        OSError,
    ):
        logger.exception(
            "SMTP connection or submission failed for handoff %s.",
            handoff_id,
        )
        raise

    # This log is reached only if SMTP submission succeeds.
    logger.info(
        "SMTP server accepted the handoff notification for %s.",
        handoff_id,
    )
