from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class RightsBasis(str, Enum):
    ORIGINAL_CREATOR = "original_creator"
    LICENSED = "licensed"
    PUBLIC_DOMAIN = "public_domain"
    CLIENT_SUPPLIED = "client_supplied"
    OTHER_AUTHORIZED = "other_authorized"


class SourceTreatment(str, Enum):
    REFERENCE_ONLY = "reference_only"
    TRANSCRIPT_TO_NEW_VIDEO = "transcript_to_new_video"
    STORYBOARD_TO_NEW_VIDEO = "storyboard_to_new_video"
    RIGHTS_SAFE_REMIX = "rights_safe_remix"


class AudioStrategy(str, Enum):
    MUTE = "mute"
    LICENSED_REPLACEMENT = "licensed_replacement"
    ORIGINAL_IF_OWNED = "original_if_owned"


class RecreationAction(str, Enum):
    RECREATE_FROM_STORYBOARD = "recreate_from_storyboard"
    TRANSCRIPT_TO_NEW_VIDEO = "transcript_to_new_video"
    YOUTUBE_POLICY_CHECK = "youtube_policy_check"
    REPLACE_AUDIO_WITH_LICENSED_TRACK = "replace_audio_with_licensed_track"
    GENERATE_NEW_VOICEOVER = "generate_new_voiceover"
    REMOVE_OWN_BRANDING = "remove_own_branding"


class RightsAttestation(BaseModel):
    ownership_confirmed: bool = Field(
        False,
        description="Uploader confirms they own or control the required rights.",
    )
    rights_basis: RightsBasis
    allow_ai_transformation: bool = False
    allow_youtube_upload: bool = False
    notes: Optional[str] = Field(
        None,
        max_length=1000,
        description="Optional license, client, or project reference.",
    )


class OwnBrandingAttestation(BaseModel):
    enabled: bool = False
    brand_owner_confirmed: bool = False
    brand_name: Optional[str] = Field(None, max_length=160)
    notes: Optional[str] = Field(
        None,
        max_length=1000,
        description="Optional project, client, or brand ownership reference.",
    )


class RecreationCreate(BaseModel):
    video_id: str
    title: Optional[str] = Field(None, max_length=160)
    target_platform: str = Field("youtube", max_length=40)
    source_treatment: SourceTreatment = SourceTreatment.STORYBOARD_TO_NEW_VIDEO
    prompt: Optional[str] = Field(None, max_length=4000)
    desired_changes: list[str] = Field(default_factory=list, max_length=20)
    requested_actions: list[RecreationAction] = Field(
        default_factory=lambda: [RecreationAction.RECREATE_FROM_STORYBOARD],
        max_length=20,
    )
    audio_strategy: AudioStrategy = AudioStrategy.MUTE
    include_source_audio: bool = False
    own_branding: Optional[OwnBrandingAttestation] = None
    rights_attestation: RightsAttestation

    @model_validator(mode="after")
    def validate_rights_safe_request(self) -> "RecreationCreate":
        attestation = self.rights_attestation
        if not attestation.ownership_confirmed:
            raise ValueError("Rights attestation is required before recreating a video.")
        if not attestation.allow_ai_transformation:
            raise ValueError("AI transformation rights must be confirmed.")
        if not attestation.allow_youtube_upload:
            raise ValueError("YouTube upload rights must be confirmed.")

        prohibited_terms = {
            "remove_watermark",
            "watermark_removal",
            "strip_watermark",
            "copyright_removal",
            "remove_copyright",
            "strip_copyright",
            "bypass_content_id",
            "content_id_bypass",
        }
        normalized_actions = {action.value for action in self.requested_actions}
        blocked = sorted(normalized_actions.intersection(prohibited_terms))
        if blocked:
            raise ValueError(
                "This API does not remove copyright notices, watermarks, or platform protections."
            )

        if RecreationAction.REMOVE_OWN_BRANDING in self.requested_actions:
            if not self.own_branding or not self.own_branding.enabled:
                raise ValueError("remove_own_branding requires own_branding.enabled=true.")
            if not self.own_branding.brand_owner_confirmed:
                raise ValueError("Brand ownership must be confirmed before removing own branding.")

        if self.include_source_audio and self.audio_strategy != AudioStrategy.ORIGINAL_IF_OWNED:
            raise ValueError("Source audio can only be retained with original_if_owned audio strategy.")

        return self


class RecreationResponse(BaseModel):
    job_id: str
    status: str
    video_id: str
    job_type: str
    safety_policy: str
    next_step: str
    parameters: dict
