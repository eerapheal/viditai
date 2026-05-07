"""
AutoCut AI — Full API Test Suite
Run with: pytest tests/ -v
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.database import Base, get_db
from app.core.config import settings

# ── Use an in-memory SQLite DB for tests ─────────────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        from app.models import user, video, job  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    from main import app
    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ── Auth tests ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "creator@example.com",
        "password": "securePass123",
        "full_name": "Test Creator",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "creator@example.com"
    assert data["user"]["plan"] == "free"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {"email": "dup@example.com", "password": "securePass123"}
    await client.post("/api/v1/auth/register", json=payload)
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "login@example.com",
        "password": "myPassword99",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "login@example.com",
        "password": "myPassword99",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "bad@example.com",
        "password": "correctPass99",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "bad@example.com",
        "password": "wrongPass",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "email": "me@example.com",
        "password": "testPass123",
    })
    token = reg.json()["access_token"]
    resp = await client.get("/api/v1/auth/me",
                            headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@example.com"


# ── User tests ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_quota(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "email": "quota@example.com",
        "password": "testPass123",
    })
    token = reg.json()["access_token"]
    resp = await client.get("/api/v1/users/me/quota",
                            headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["plan"] == "free"
    assert data["monthly_exports_limit"] == settings.FREE_MONTHLY_EXPORTS


@pytest.mark.asyncio
async def test_update_profile(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "email": "update@example.com",
        "password": "testPass123",
        "full_name": "Old Name",
    })
    token = reg.json()["access_token"]
    resp = await client.patch(
        "/api/v1/users/me",
        json={"full_name": "New Name"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "New Name"


# ── Preset tests ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_presets(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "email": "presets@example.com",
        "password": "testPass123",
    })
    token = reg.json()["access_token"]
    resp = await client.get("/api/v1/presets/",
                            headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    presets = resp.json()
    assert len(presets) >= 5
    ids = [p["id"] for p in presets]
    assert "fast_pace" in ids
    assert "viral_mode" in ids


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    resp = await client.get("/")
    assert resp.status_code == 200
    assert resp.json()["service"] == "AutoCut AI API"


# ── Job schema validation tests ───────────────────────────────────────────────

def test_pattern_cut_params_valid():
    from app.schemas.job import PatternCutParams
    p = PatternCutParams(keep_seconds=4, cut_seconds=1)
    assert p.keep_seconds == 4.0
    assert p.cut_seconds == 1.0


def test_pattern_cut_params_invalid():
    from app.schemas.job import PatternCutParams
    import pydantic
    with pytest.raises(pydantic.ValidationError):
        PatternCutParams(keep_seconds=-1, cut_seconds=1)


def test_silence_removal_params():
    from app.schemas.job import SilenceRemovalParams
    p = SilenceRemovalParams(silence_threshold_db=-35, min_silence_duration=0.3)
    assert p.padding_seconds == 0.1  # default


def test_job_create_validates_params():
    from app.schemas.job import JobCreate
    import pydantic
    with pytest.raises(pydantic.ValidationError):
        JobCreate(
            video_id="abc",
            job_type="pattern_cut",
            parameters={"keep_seconds": -5, "cut_seconds": 1},
        )


def test_recreation_requires_rights_attestation():
    from app.schemas.recreation import RecreationCreate
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        RecreationCreate(
            video_id="abc",
            requested_actions=[],
            rights_attestation={
                "ownership_confirmed": False,
                "rights_basis": "original_creator",
                "allow_ai_transformation": True,
                "allow_youtube_upload": True,
            },
        )


def test_recreation_rejects_watermark_removal():
    from app.schemas.recreation import RecreationCreate
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        RecreationCreate(
            video_id="abc",
            requested_actions=["remove watermark"],
            rights_attestation={
                "ownership_confirmed": True,
                "rights_basis": "licensed",
                "allow_ai_transformation": True,
                "allow_youtube_upload": True,
            },
        )


def test_recreation_allows_remove_own_branding_with_attestation():
    from app.schemas.recreation import RecreationCreate

    request = RecreationCreate(
        video_id="abc",
        requested_actions=["remove_own_branding", "youtube_policy_check"],
        own_branding={
            "enabled": True,
            "brand_owner_confirmed": True,
            "brand_name": "My Channel",
        },
        rights_attestation={
            "ownership_confirmed": True,
            "rights_basis": "original_creator",
            "allow_ai_transformation": True,
            "allow_youtube_upload": True,
        },
    )

    assert [action.value for action in request.requested_actions] == [
        "remove_own_branding",
        "youtube_policy_check",
    ]


def test_recreation_rejects_remove_own_branding_without_attestation():
    from app.schemas.recreation import RecreationCreate
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        RecreationCreate(
            video_id="abc",
            requested_actions=["remove_own_branding"],
            rights_attestation={
                "ownership_confirmed": True,
                "rights_basis": "original_creator",
                "allow_ai_transformation": True,
                "allow_youtube_upload": True,
            },
        )
