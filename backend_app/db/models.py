from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Enum, ForeignKey, Index, Numeric, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


UserRoleEnum = Enum("producer", "auditor", "company", "certifier", "admin", name="user_role", create_type=False)
ProjectStatusEnum = Enum(
    "DRAFT",
    "CREATED",
    "REGISTERED",
    "BASELINE_PENDING",
    "AWAITING_CERTIFICATION",
    "CERTIFIED_AWAITING_TREASURY",
    "TOKENIZED_LOCKED",
    "AWAITING_AUDIT",
    "AUDITED",
    "ACTIVE",
    "AVAILABLE",
    "RESERVED",
    "TRANSFERRED",
    "BLOCKED_AUDIT_REQUIRED",
    "RECALCULATION_REQUIRED",
    "SUSPENDED",
    "RETIRED",
    name="project_status",
    create_type=False,
)
CreditStatusEnum = Enum(
    "LOCKED",
    "AVAILABLE",
    "RESERVED",
    "OWNED_OFFCHAIN",
    "RETIRED",
    "BURNED",
    "SUSPENDED",
    name="credit_status",
    create_type=False,
)
LedgerEntryTypeEnum = Enum(
    "CREDIT_ISSUED",
    "PURCHASE",
    "RECEIVED",
    "TRANSFER_SENT",
    "RETIREMENT",
    "MINT",
    "BURN",
    "RESERVE",
    "YIELD",
    "ADJUSTMENT",
    name="ledger_entry_type",
    create_type=False,
)
ChainEventTypeEnum = Enum(
    "MINT_LOCKED",
    "UNLOCK",
    "TRANSFER",
    "BURN",
    "SPONSORED_RESERVE",
    "PIX_CONFIRMED",
    "TREASURY_LOCK",
    "VAULT_LOCK",
    "WRAPPED_MINT",
    "STATUS_CHECK",
    name="chain_event_type",
    create_type=False,
)
ExternalChainEnum = Enum("stellar", "soroban", "etherfuse", "polygon", name="external_chain", create_type=False)


def uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))


def created_at_column() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


def updated_at_column() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = uuid_pk()
    external_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    document: Mapped[str | None] = mapped_column(String)
    website: Mapped[str | None] = mapped_column(String)
    logo_url: Mapped[str | None] = mapped_column(String)
    authorized: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()


class InventoryRegion(Base):
    __tablename__ = "inventory_regions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    uf: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    emissions: Mapped[dict] = mapped_column(JSONB, nullable=False)
    local_contributions: Mapped[dict] = mapped_column(JSONB, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()


class Profile(Base):
    __tablename__ = "profiles"
    __table_args__ = (Index("profiles_email_lower_idx", func.lower(text("email")), unique=True),)

    id: Mapped[uuid.UUID] = uuid_pk()
    external_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    document: Mapped[str | None] = mapped_column(String)
    role: Mapped[str] = mapped_column(UserRoleEnum, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str | None] = mapped_column(String)
    avatar_url: Mapped[str | None] = mapped_column(String)
    gov_level: Mapped[str | None] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        Index(
            "projects_public_marketplace_ready_idx",
            "public_marketplace",
            "status",
            postgresql_where=text("public_marketplace is true"),
        ),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    friendly_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    source_hash: Mapped[str | None] = mapped_column(String, unique=True)
    version: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'v1.0'"))
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    baseline: Mapped[str | None] = mapped_column(Text)
    methodology: Mapped[str] = mapped_column(String, nullable=False)
    methodology_link: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(ProjectStatusEnum, nullable=False, server_default=text("'REGISTERED'"))
    public_marketplace: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    producer_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    developer_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    auditor_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    certifier_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    registry_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    city: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False)
    state_id: Mapped[str] = mapped_column(String, nullable=False)
    biome: Mapped[str] = mapped_column(String, nullable=False)
    latitude: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False)
    svg_x: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    svg_y: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    area_hectares: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    carbon_stock: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    investment_value_brl: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, server_default=text("0"))
    vintage: Mapped[str] = mapped_column(String, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String)
    serial_start: Mapped[str | None] = mapped_column(String)
    serial_end: Mapped[str | None] = mapped_column(String)
    contract_address: Mapped[str | None] = mapped_column(String)
    merkle_root: Mapped[str | None] = mapped_column(String)
    block_height: Mapped[int | None] = mapped_column(BigInteger)
    blockchain_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    timeline: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()


class ProjectTag(Base):
    __tablename__ = "project_tags"

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    has_qtag: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    tag_uid: Mapped[str | None] = mapped_column(String)
    cmac: Mapped[str | None] = mapped_column(String)
    latitude: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False)
    vertex_label: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'ACTIVE'"))
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = created_at_column()


class ProjectBoundary(Base):
    """Geometria persistida do projeto (Phase 04.1).

    As quatro colunas geometry(Polygon, 4326) — declared_boundary,
    field_verified_boundary, certified_boundary e active_boundary — NAO sao
    mapeadas aqui de proposito: o repo nao usa GeoAlchemy2, e toda leitura/
    escrita de geometria acontece por SQL parametrizado com funcoes ST_*
    (ST_GeomFromText, ST_AsGeoJSON, ST_Intersects). SQLAlchemy nao exige
    cobertura total das colunas da tabela.
    """

    __tablename__ = "project_boundaries"

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    declared_area_ha: Mapped[Decimal | None] = mapped_column(Numeric(14, 4))
    declared_source: Mapped[str | None] = mapped_column(String)
    declared_vertex_count: Mapped[int | None] = mapped_column()
    declared_area_divergence_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4))
    declared_area_divergence_flagged: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    field_verified_area_ha: Mapped[Decimal | None] = mapped_column(Numeric(14, 4))
    field_verified_source: Mapped[str | None] = mapped_column(String)
    field_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    certified_area_ha: Mapped[Decimal | None] = mapped_column(Numeric(14, 4))
    certified_source: Mapped[str | None] = mapped_column(String)
    certified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    active_boundary_tier: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'DECLARED'"))
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))


class ProjectBaseline(Base):
    __tablename__ = "project_baselines"

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    sentinel_scene_id: Mapped[str] = mapped_column(String, nullable=False)
    baseline_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    points_analyzed: Mapped[int] = mapped_column(nullable=False)
    vegetation_cover_pct: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False)
    ndvi_mean: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    evidence_uri: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = created_at_column()


class Certification(Base):
    __tablename__ = "certifications"
    __table_args__ = (Index("certifications_project_created_idx", "project_id", "created_at"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    certifier_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    certifier_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    methodology: Mapped[str] = mapped_column(String, nullable=False)
    credit_potential: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    decision: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    signed_document_hash: Mapped[str | None] = mapped_column(String)
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_column()


class CertificationPendency(Base):
    __tablename__ = "certification_pendencies"
    __table_args__ = (
        Index("certification_pendencies_project_status_idx", "project_id", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    certification_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("certifications.id"))
    certifier_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    raised_by_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    category: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'OPEN'"))
    producer_response: Mapped[str | None] = mapped_column(Text)
    responded_by_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = created_at_column()


class TreasuryAuthorization(Base):
    __tablename__ = "treasury_authorizations"
    __table_args__ = (
        UniqueConstraint("certification_id", name="treasury_authorizations_certification_idx"),
        Index("treasury_authorizations_status_idx", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    certification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("certifications.id"), nullable=False)
    certifier_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    certifier_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    methodology: Mapped[str] = mapped_column(String, nullable=False)
    approved_credit_potential: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    certificate_document_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"))
    certificate_sha256: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'PENDING'"))
    authorized_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = created_at_column()


class Audit(Base):
    __tablename__ = "audits"
    __table_args__ = (UniqueConstraint("project_id", "status", name="audits_project_status_idx"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    auditor_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    auditor_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    status: Mapped[str] = mapped_column(String, nullable=False)
    report_text: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 6))
    evidence_urls: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    digital_signature: Mapped[str | None] = mapped_column(String)
    audited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_column()


class EnvironmentalCredit(Base):
    __tablename__ = "environmental_credits"
    __table_args__ = (UniqueConstraint("project_id", "vintage", name="environmental_credits_project_vintage_idx"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    vintage: Mapped[str] = mapped_column(String, nullable=False)
    quantity_total: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    quantity_available: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    quantity_retired: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, server_default=text("0"))
    status: Mapped[str] = mapped_column(CreditStatusEnum, nullable=False, server_default=text("'LOCKED'"))
    unit: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'tCO2e'"))
    token_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    serial_start: Mapped[str | None] = mapped_column(String)
    serial_end: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()


class LedgerAccount(Base):
    __tablename__ = "ledger_accounts"

    id: Mapped[uuid.UUID] = uuid_pk()
    external_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    owner_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    owner_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"))
    account_type: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'tCO2e'"))
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, server_default=text("0"))
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()


class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    buyer_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    buyer_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    credit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("environmental_credits.id"))
    quantidade: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    unit_price_brl: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    total_value_brl: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    platform_fee_brl: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, server_default=text("0"))
    receipt_hash: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'SETTLED'"))
    idempotency_key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_column()


class Retirement(Base):
    __tablename__ = "retirements"

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    owner_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    owner_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'tCO2e'"))
    emissions_data: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    certificate_hash: Mapped[str | None] = mapped_column(String)
    burn_hash: Mapped[str | None] = mapped_column(String)
    documentation_uri: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'COMPLETED'"))
    idempotency_key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    retired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_column()


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id: Mapped[uuid.UUID] = uuid_pk()
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ledger_accounts.id"), nullable=False)
    entry_type: Mapped[str] = mapped_column(LedgerEntryTypeEnum, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String, nullable=False)
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"))
    purchase_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("purchases.id"))
    retirement_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("retirements.id"))
    idempotency_key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    counterparty: Mapped[str | None] = mapped_column(String)
    chain_event_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("chain_events.id"))
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = created_at_column()


class TreasuryPosition(Base):
    __tablename__ = "treasury_positions"

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    principal_brl: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    instrument: Mapped[str] = mapped_column(String, nullable=False)
    external_reference: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = updated_at_column()
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))


class YieldDistribution(Base):
    __tablename__ = "yield_distributions"
    __table_args__ = (UniqueConstraint("treasury_position_id", "distribution_month", name="yield_distributions_position_month_idx"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    treasury_position_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("treasury_positions.id"), nullable=False)
    gross_yield_brl: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    operational_brl: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    social_vault_brl: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    distribution_month: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'BOOKED'"))
    created_at: Mapped[datetime] = created_at_column()


class ChainEvent(Base):
    __tablename__ = "chain_events"

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"))
    event_type: Mapped[str] = mapped_column(ChainEventTypeEnum, nullable=False)
    chain: Mapped[str] = mapped_column(ExternalChainEnum, nullable=False)
    transaction_hash: Mapped[str | None] = mapped_column(String)
    source_tx_hash: Mapped[str | None] = mapped_column(String)
    amount: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    status: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'RECORDED'"))
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = created_at_column()


class ExternalChainProject(Base):
    __tablename__ = "external_chain_projects"

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"))
    chain: Mapped[str] = mapped_column(ExternalChainEnum, nullable=False)
    vault_address: Mapped[str] = mapped_column(String, nullable=False)
    source_token_address: Mapped[str] = mapped_column(String, nullable=False)
    source_tx_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    wrapped_stellar_asset: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = created_at_column()


class ProjectDraft(Base):
    __tablename__ = "project_drafts"
    __table_args__ = (
        Index("project_drafts_owner_status_idx", "owner_profile_id", "status", "updated_at"),
        Index("project_drafts_producer_status_idx", "producer_organization_id", "status", "updated_at"),
        Index("project_drafts_target_project_idx", "target_project_id", "status", "updated_at"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    owner_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    producer_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    draft_kind: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'CREATE'"))
    target_project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"))
    current_step: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'project'"))
    status: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'DRAFT'"))
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    submitted_project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()


class ProjectDraftDocument(Base):
    __tablename__ = "project_draft_documents"
    __table_args__ = (
        Index("project_draft_documents_draft_idx", "draft_id", "document_type"),
        Index("project_draft_documents_sha256_hash_idx", "sha256_hash"),
        UniqueConstraint("draft_id", "sha256_hash", name="project_draft_documents_draft_sha256_key"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    draft_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project_drafts.id"), nullable=False)
    owner_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    document_type: Mapped[str] = mapped_column(String, nullable=False)
    storage_bucket: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'projects'"))
    storage_object_path: Mapped[str | None] = mapped_column(String)
    storage_path: Mapped[str] = mapped_column(String, nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    uploaded_at: Mapped[datetime] = created_at_column()
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        Index("documents_sha256_hash_idx", "sha256_hash"),
        UniqueConstraint("project_id", "sha256_hash", name="documents_project_sha256_key"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    owner_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    owner_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"))
    document_type: Mapped[str] = mapped_column(String, nullable=False)
    storage_bucket: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'projects'"))
    storage_object_path: Mapped[str | None] = mapped_column(String)
    storage_path: Mapped[str] = mapped_column(String, nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    uploaded_at: Mapped[datetime] = created_at_column()
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = uuid_pk()
    actor_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    actor_role: Mapped[str | None] = mapped_column(UserRoleEnum)
    action: Mapped[str] = mapped_column(String, nullable=False)
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    before_data: Mapped[dict | None] = mapped_column(JSONB)
    after_data: Mapped[dict | None] = mapped_column(JSONB)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = created_at_column()


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"
    __table_args__ = (UniqueConstraint("key", "scope", name="idempotency_keys_key_scope_idx"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    key: Mapped[str] = mapped_column(String, nullable=False)
    scope: Mapped[str] = mapped_column(String, nullable=False)
    request_hash: Mapped[str] = mapped_column(String, nullable=False)
    response_payload: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'RECORDED'"))
    created_at: Mapped[datetime] = created_at_column()
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
