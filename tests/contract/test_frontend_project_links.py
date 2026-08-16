from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_project_detail_links_prefer_friendly_ids() -> None:
    global_map = read("src/pages/Dashboard/GlobalMap.tsx")
    database_service = read("src/services/database.ts")
    mrca_item = read("src/components/MRCAItem.tsx")
    overview = read("src/pages/Dashboard/Overview.tsx")
    dashboard_layout = read("src/layouts/DashboardLayout.tsx")

    assert "projectId: proj.friendlyId" in database_service
    assert "project.friendlyId || project.id" in global_map
    assert "hoveredProject.friendlyId || hoveredProject.id" in global_map
    assert "data.friendlyId || data.projectId || data.id" in mrca_item
    assert "project?.friendlyId || project?.projectId || project?.id" in overview
    assert "navigate(`/painel/mrca/${targetId}`)" in overview
    assert 'to="/painel/projetos"' in dashboard_layout
    assert "navigate(`/painel/mrca/${project.id}`)" not in global_map
    assert "navigate(`/painel/mrca/${hoveredProject.id}`)" not in global_map


def test_producer_overview_has_working_actions_and_readable_static_map() -> None:
    overview = read("src/pages/Dashboard/Overview.tsx")
    project_dot_map = read("src/components/maps/ProjectDotMap.tsx")
    dashboard_layout = read("src/layouts/DashboardLayout.tsx")
    app = read("src/App.tsx")
    producer_overview = overview.split("if (isProducer) {", 1)[1].split("const isAuditor", 1)[0]

    assert "navigate('/painel/projetos')" in overview
    assert "onClick={() => openProject(p)}" in overview
    assert "aria-label={`Ver projeto" in overview
    assert "text-gray-600" in overview
    assert "PROJECTS_PER_PAGE = 5" in overview
    assert "portfolioOnly: isProducerAccount" in overview
    assert "const projectTotal = dashboardProjects.length" in overview
    assert "const paginatedProjects = dashboardProjects.slice" in overview
    assert "setProjectPage((page) => Math.max(1, page - 1))" in overview
    assert "Página {projectPage} de {totalProjectPages}" in overview
    assert "value={projectTotal.toLocaleString('pt-BR')}" in overview
    assert "value=\"5\"" not in overview
    assert "item.project?.lifecycleStatus !== 'DRAFT'" in overview
    assert "const producerDashboardMetrics = buildProducerDashboardMetrics(dashboardProjects);" in overview
    assert "const AUDIT_PENDING_STATUSES = new Set" in overview
    assert "value={producerDashboardMetrics.activeCredits}" in producer_overview
    assert "value={producerDashboardMetrics.pendingAudits}" in producer_overview
    assert "value={producerDashboardMetrics.totalArea}" in producer_overview
    assert "value={producerDashboardMetrics.co2Sequestered}" in producer_overview
    assert "value={producerDashboardMetrics.generatedRevenue}" in producer_overview
    assert 'value="250"' not in producer_overview
    assert 'value="1"' not in producer_overview
    assert 'value="12.450"' not in producer_overview
    assert 'value="45.680"' not in producer_overview
    assert 'value="R$ 2.560.000"' not in producer_overview

    assert "animate-ping" not in project_dot_map
    assert "Mapa estático de localização dos projetos" in project_dot_map
    assert "filter(hasMapCoordinates)" in project_dot_map

    assert "theme === 'dark' ? 'text-white' : 'text-black'" in dashboard_layout
    assert "location.pathname === '/painel/projetos'" in dashboard_layout
    assert "fixed inset-y-0 left-0 h-dvh w-72" in dashboard_layout
    assert "lg:ml-72" in dashboard_layout
    assert "flex-1 p-10" in dashboard_layout
    assert "overflow-y-auto p-10" not in dashboard_layout
    assert '<Route path="relatorios" element={<Reports />} />' in app


def test_review_queues_read_mrca_metrics_payload() -> None:
    auditor_review = read("src/pages/Dashboard/AuditorReview.tsx")
    certifier_review = read("src/pages/Dashboard/CertifierReview.tsx")

    for review_page in (auditor_review, certifier_review):
        assert "project.metrics?.totalAreaHa" in review_page
        assert "project.metrics?.carbonStock" in review_page
        assert "project.area_hectares.toLocaleString" not in review_page
        assert "project.carbonStock.toLocaleString" not in review_page


def test_auditor_queue_has_client_side_pagination() -> None:
    auditor_review = read("src/pages/Dashboard/AuditorReview.tsx")

    assert "const pageSize = 5" in auditor_review
    assert "paginatedItems.map" in auditor_review
    assert "Página {currentPage} de {totalPages}" in auditor_review
    assert "setCurrentPage((page) => Math.max(1, page - 1))" in auditor_review
    assert "setCurrentPage((page) => Math.min(totalPages, page + 1))" in auditor_review


def test_auditor_queue_exposes_field_evidence_review_and_report_submission() -> None:
    auditor_review = read("src/pages/Dashboard/AuditorReview.tsx")

    assert "database.getMonitoringProject(project.friendlyId || project.id)" in auditor_review
    assert "Revisar evidências" in auditor_review
    assert "Abrir página do projeto" in auditor_review
    assert "to={`/painel/mrca/${project.friendlyId || project.id}`}" in auditor_review
    assert "Tags NFC 424 DNA" in auditor_review
    assert "VERIFICAÇÃO DE TAGS" in auditor_review
    assert "ESTADO DA ÁREA" in auditor_review
    assert "evidencias_url: evidenceUrls" in auditor_review
    assert "assinatura_digital: draft.signature" in auditor_review
    assert "const latitude = draft.latitude ? Number(draft.latitude) : undefined;" in auditor_review
    assert "const longitude = draft.longitude ? Number(draft.longitude) : undefined;" in auditor_review
    assert "Área preservada conforme baseline" in auditor_review


def test_auditor_queue_filters_by_project_code_and_location_and_signs_with_auditor_name() -> None:
    auditor_review = read("src/pages/Dashboard/AuditorReview.tsx")

    assert "const { user } = useAuth();" in auditor_review
    assert "createDefaultDraft(user?.name)" in auditor_review
    assert "Assinado digitalmente por ${auditorName}" in auditor_review
    assert "searchTerm" in auditor_review
    assert "locationFilter" in auditor_review
    assert "filteredItems" in auditor_review
    assert "filteredItems.slice(start, start + pageSize)" in auditor_review
    assert "Buscar por projeto ou código" in auditor_review
    assert "Todos os locais/UFs" in auditor_review
    assert "project.friendlyId" in auditor_review
    assert "project.location.stateId" in auditor_review


def test_audit_report_preview_has_hover_copy_button() -> None:
    auditor_review = read("src/pages/Dashboard/AuditorReview.tsx")

    assert "copyReportPreview" in auditor_review
    assert "navigator.clipboard.writeText(reportPreview)" in auditor_review
    assert "Copiar relatório" in auditor_review
    assert "Relatório copiado" in auditor_review
    assert "group-hover:opacity-100" in auditor_review
    assert "focus:opacity-100" in auditor_review


def test_audit_report_evidence_uses_local_file_picker_instead_of_url_textarea() -> None:
    auditor_review = read("src/pages/Dashboard/AuditorReview.tsx")

    assert "type=\"file\"" in auditor_review
    assert "multiple" in auditor_review
    assert "accept=\"image/*,.pdf,.doc,.docx,.heic\"" in auditor_review
    assert "Fotos/documentos da vistoria" in auditor_review
    assert "MAX_AUDIT_EVIDENCE_FILE_SIZE_BYTES = 10 * 1024 * 1024" in auditor_review
    assert "Limite máximo: 10 MB por arquivo" in auditor_review
    assert "file.size <= MAX_AUDIT_EVIDENCE_FILE_SIZE_BYTES" in auditor_review
    assert "Arquivos acima de 10 MB não foram anexados" in auditor_review
    assert "Arquivos selecionados" in auditor_review
    assert "Tamanho:" in auditor_review
    assert auditor_review.index("Checklist de campo") < auditor_review.index("Fotos/documentos da vistoria") < auditor_review.index("Relatório de auditoria")
    assert "addEvidenceFiles" in auditor_review
    assert "removeEvidenceFile" in auditor_review
    assert "local://auditoria/${projectKey}/${encodeURIComponent(file.name)}" in auditor_review
    assert "draft.evidenceFiles.map((file) => file.localUrl)" in auditor_review
    assert "URLs de fotos/documentos" not in auditor_review


def test_phase3_project_origination_uses_real_tags_documents_and_dossier_data() -> None:
    add_project = read("src/pages/Dashboard/AddProject.tsx")
    mrca_details = read("src/pages/Dashboard/MrcaDetails.tsx")
    project_origination = read("src/services/projectOrigination.ts")
    geofence_preview = read("src/components/ProjectGeofencePreview.tsx")
    geofence_editor = read("src/components/ProjectGeofenceEditorMap.tsx")
    project_drafts = read("src/services/projectDrafts.ts")
    package_json = read("package.json")
    project_step = add_project.split("const renderProjectStep = () => (", 1)[1].split("const renderQtagStep = () => (", 1)[0]
    location_step = add_project.split("const renderQtagStep = () => (", 1)[1].split("const renderDocumentsStep = () => (", 1)[0]
    main_layout = add_project.split('<div className="mx-auto flex max-w-5xl flex-col gap-6">', 1)[1]

    assert "saveProjectDraft" in add_project
    assert "submitProjectDraft" in add_project
    assert "uploadProjectDraftDocument" in add_project
    assert "Imagem do projeto" in add_project
    assert 'accept="image/*"' in add_project
    assert "handleProjectImageSelected" in add_project
    assert "projectImageInputRef" in add_project
    assert "openProjectImagePicker" in add_project
    assert "Selecionar imagem" in add_project
    assert "documentFileInputRef" in add_project
    assert "openDocumentPicker" in add_project
    assert "Selecionar arquivo" in add_project
    assert "multiple" in add_project
    assert "documentType: uploaded.documentType as ProjectDocumentType" in add_project
    assert "removeProjectImage" in add_project
    assert "image_url: form.imageUrl || undefined" in add_project
    assert "imageUrl: ''" in add_project
    assert "URL.createObjectURL" not in add_project
    assert "ProjectGeofenceEditorMap" in add_project
    assert "compactErrors.slice" not in geofence_preview
    assert "Complete os vértices e coordenadas para formar uma área válida." in geofence_preview
    assert "activeMapVertex" in add_project
    assert "handleMapCoordinatePick" in add_project
    assert "PROJECT_LOCATION_FALLBACKS" in add_project
    assert "DEFAULT_PROJECT_LOCATION_HINT" in add_project
    assert "label: 'Brasil'" in add_project
    assert "resolveProjectLocationHint" in add_project
    assert "nominatim.openstreetmap.org" in add_project
    assert "initialMapPoint" in add_project
    assert "setMapInitialPoint" in add_project
    assert "initialPoint={initialMapPoint}" in add_project
    assert "validateLocationFields" in add_project
    assert "initialLatitudePlaceholder" in add_project
    assert "initialLongitudePlaceholder" in add_project
    assert "placeholder={initialLatitudePlaceholder}" in add_project
    assert "placeholder={initialLongitudePlaceholder}" in add_project
    assert 'placeholder="-10.700000"' not in add_project
    assert 'placeholder="-48.410000"' not in add_project
    assert "nextEmptyVertex" in add_project
    assert "label: 'Localização'" in add_project
    assert "Localização da área" in add_project
    assert 'htmlFor="city">Município' not in project_step
    assert 'htmlFor="state">UF' not in project_step
    assert location_step.index('htmlFor="city">Município') < location_step.index('Registre no mínimo 4 vértices')
    assert location_step.index('htmlFor="state">UF') < location_step.index('Registre no mínimo 4 vértices')
    assert "tagValidation.errors.slice(0, 8).map" not in add_project
    assert "vertexErrors.map((item)" not in add_project
    assert "Complete os dados deste vértice." in add_project
    assert "Adicionar vértice à área" in add_project
    assert location_step.index("Adicionar vértice à área") < location_step.index("xl:grid-cols-[280px_minmax(0,1fr)]")
    assert "xl:grid-cols-[280px_minmax(0,1fr)_380px]" not in add_project
    assert 'className="space-y-5 xl:col-span-2"' in location_step
    assert location_step.index("Dados do vértice ativo") < location_step.index('className="space-y-5 xl:col-span-2"')
    assert "content-start items-start gap-4 lg:grid-cols-2 xl:self-start" not in add_project
    assert "const getVertexStatusMeta = (tag: ProjectTagDraft)" in add_project
    assert "Lista de vértices" in add_project
    assert "Dados do vértice ativo" in add_project
    assert "const activeTag = tags.find((tag) => tag.vertex_label === activeMapVertex) || tags[0];" in add_project
    assert "const activeVertex = activeTag?.vertex_label || 'A';" in add_project
    assert "const activeVertexErrors = activeTag ? tagValidation.vertexErrors[activeVertex] || [] : [];" in add_project
    assert 'aria-label={`Selecionar vértice ${tag.vertex_label} na lista`}' in add_project
    assert "onClick={() => setActiveMapVertex(tag.vertex_label)}" in add_project
    assert "Possui QTAG" in add_project
    assert "checked={activeTag.has_qtag}" in add_project
    assert "onChange={toggleActiveVertexQtag}" in add_project
    assert "activeTag.has_qtag && (" in add_project
    assert location_step.index("activeTag.has_qtag && (") < location_step.index("value={activeTag.tag_uid}")
    assert "updateTag(activeVertex, 'tag_uid')" in add_project
    assert "Sem QTAG física" in add_project
    assert "Vértice ativo: {activeVertex}" in add_project
    assert "Vértice ausente" in add_project
    assert "Vértice completo" in add_project
    assert "value={tag.tag_uid}" not in location_step
    assert "onClick={() => setStep(item.id)}" in add_project
    assert 'aria-label={`Ir para seção ${item.label}`}' in add_project
    assert "disabled={index > currentStepIndex}" not in add_project
    assert "index <= currentStepIndex" not in add_project
    assert "Salvar rascunho" in add_project
    assert "Alterações não salvas" in add_project
    assert "Salvo há" in add_project
    assert "const AUTO_SAVE_DRAFT_INTERVAL_MS = 5 * 60 * 1000" in add_project
    assert "}, AUTO_SAVE_DRAFT_INTERVAL_MS)" in add_project
    assert "}, 1400)" not in add_project
    assert "Salvando rascunho..." in add_project
    assert "Rascunho salvo" in add_project
    assert "Autosave em até 5 min" in add_project
    assert "Rascunhos existentes" in add_project
    assert "const renderDraftsSection = () => (" in add_project
    assert "{renderDraftsSection()}" in main_layout
    assert main_layout.index("</form>") < main_layout.index("{renderDraftsSection()}")
    assert "Continuar rascunho" in add_project
    assert "discardProjectDraft" in add_project
    assert "Excluir rascunho" in add_project
    assert "deletingDraftId === draft.id" in add_project
    assert "draftCarouselRef" in add_project
    assert "scrollDraftCarousel" in add_project
    assert "aria-label=\"Rascunhos anteriores\"" in add_project
    assert "aria-label=\"Próximos rascunhos\"" in add_project
    assert "const renderDraftSaveControl = () => (" in add_project
    assert 'aria-label="Salvar rascunho no rodapé"' in add_project
    header_area = main_layout.split('<div className="grid grid-cols-1 gap-3 md:grid-cols-4">', 1)[0]
    assert "Salvar rascunho" not in header_area
    form_footer = main_layout.split('<div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5', 1)[1].split("</form>", 1)[0]
    assert form_footer.index("{renderDraftSaveControl()}") < form_footer.index("Criar projeto")
    assert form_footer.index("{renderDraftSaveControl()}") < form_footer.index("Continuar")
    assert "text-white" not in add_project
    assert "font-extrabold text-gray-950" in add_project
    assert "overflow-x-auto" in add_project
    assert "snap-x" in add_project
    assert "data-draft-card" in add_project
    assert "lg:w-[calc((100%-1.5rem)/3)]" in add_project
    assert "mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" not in add_project
    assert "publicMarketplace: false" in add_project
    assert "checked={form.publicMarketplace}" in add_project
    assert "publicMarketplace: event.target.checked" in add_project
    assert "public_marketplace: form.publicMarketplace" in add_project
    assert "Disponibilizar no marketplace público" in add_project
    assert "status: 'DISCARDED'" in project_drafts
    assert "drafts.map((draft)" in add_project
    assert "drafts.slice(0, 4)" not in add_project
    assert "apiPost<any>('/projects'" not in add_project
    assert "/project-drafts" in project_drafts
    assert "database.getInventoryData()" in add_project
    assert '<select id="state"' in add_project
    assert '<input id="state"' not in add_project
    assert "Catálogo de UFs não carregado pelo banco." in add_project
    assert "tags: normalizeProjectTags(tags)" in add_project
    assert "addProjectTagDraft" in add_project
    assert "removeProjectTagDraft" in add_project
    assert "Adicionar vértice" in add_project
    assert "type=\"file\"" in add_project
    assert "FormData" in read("src/services/projectDocuments.ts")
    assert "FormData" in project_drafts
    assert "Arraste os arquivos aqui" not in add_project
    assert "dropzone" not in add_project.lower()

    assert "dossier.tags" in mrca_details
    assert ".filter((tag) => tag.vertex" not in mrca_details
    assert "dossier.documents" in mrca_details
    assert "ProjectGeofencePreview" in mrca_details
    assert "Nenhum vértice público registrado" in mrca_details
    assert "Sem QTAG física" in mrca_details

    assert "MIN_PROJECT_TAGS = 4" in project_origination
    assert "getNextVertexLabel" in project_origination
    assert "calculatePolygonArea" in project_origination
    assert "has_qtag: Boolean(tag.has_qtag)" in project_origination
    assert "tag.has_qtag && !tag.tag_uid.trim()" in project_origination
    assert "tag.has_qtag && !tag.cmac.trim()" in project_origination
    assert "Registre no mínimo 4 vértices" in project_origination
    assert "parseProjectCoordinate" in project_origination
    assert "const normalized = String(value).trim().replace(',', '.');" in project_origination
    assert "if (!normalized) return Number.NaN;" in project_origination

    assert '"leaflet"' in package_json
    assert "import L" in geofence_editor
    assert "leaflet/dist/leaflet.css" in geofence_editor
    assert "tile.openstreetmap.org" in geofence_editor
    assert "map.on('click'" in geofence_editor
    assert "onSetVertexCoordinates" in geofence_editor
    assert 'aria-label={`Selecionar vértice ${tag.vertex_label} no mapa`}' in geofence_editor
    assert "initialPoint" in geofence_editor
    assert "Ponto inicial" in geofence_editor
    assert "map.setView([initialPoint.latitude, initialPoint.longitude]" in geofence_editor
    assert "L.polygon" in geofence_editor
    assert "L.divIcon" in geofence_editor
    assert "<iframe" not in geofence_editor

    assert "OpenStreetMap" in geofence_preview
    assert "import L" in geofence_preview
    assert "leaflet/dist/leaflet.css" in geofence_preview
    assert "tile.openstreetmap.org" in geofence_preview
    assert "World_Imagery/MapServer/tile/{z}/{y}/{x}" in geofence_preview
    assert "previewMapLayer" in geofence_preview
    assert "setPreviewMapLayer('satellite')" in geofence_preview
    assert "Camada do preview técnico" in geofence_preview
    assert "Satélite" in geofence_preview
    assert "technicalPreviewLayer" in geofence_preview
    assert "Camada do preview técnico normalizado" in geofence_preview
    assert "pattern id=\"technical-satellite-layer\"" in geofence_preview
    assert "arcgis" in geofence_preview.lower()
    assert "image href={TECHNICAL_SATELLITE_TEXTURE}" in geofence_preview
    assert "shouldRenderMap" in geofence_preview
    assert "validCoordinateTags.length > 0" in geofence_preview
    assert "L.polygon" in geofence_preview
    assert "L.polyline" in geofence_preview
    assert "L.marker" in geofence_preview
    assert "fitBounds" in geofence_preview
    assert "setView" in geofence_preview
    assert "<iframe" not in geofence_preview
    assert "pointer-events-none absolute" not in geofence_preview
    assert "Preview técnico" in geofence_preview
    assert "Polígono técnico da geofence do projeto" in geofence_preview
    assert "<polygon" in geofence_preview
    assert "não formam uma área válida" in geofence_preview


def test_project_editing_reuses_origination_form_and_drafts() -> None:
    app = read("src/App.tsx")
    add_project = read("src/pages/Dashboard/AddProject.tsx")
    database_service = read("src/services/database.ts")
    project_drafts = read("src/services/projectDrafts.ts")
    overview = read("src/pages/Dashboard/Overview.tsx")

    assert '<Route path="mrca/:id/editar" element={<AddProject mode="edit" />} />' in app
    assert '<Route path="projetos/:id/editar" element={<AddProject mode="edit" />} />' in app
    assert "mode = 'create'" in add_project
    assert "useParams" in add_project
    assert "editingProjectId" in add_project
    assert "loadedEditingProjectRef" in add_project
    assert "loadedEditingProjectRef.current === editingProjectId" in add_project
    assert "loadedEditingProjectRef.current = editingProjectId" in add_project
    apply_edit_block = add_project.split("const applyProjectForEditing = useCallback(", 1)[1].split("useEffect(() => {\n        let active = true;", 1)[0]
    assert "draftSignature" not in apply_edit_block
    assert "}, []);" in apply_edit_block
    assert "database.getProjectPublicDossier(editingProjectId)" in add_project
    assert "applyProjectForEditing" in add_project
    assert "updateProject" in add_project
    assert "PATCH /api/v1/projects" not in add_project
    assert "Projeto atualizado" in add_project
    assert "Salvar rascunho de edição" in add_project
    assert "draft_kind: mode === 'edit' ? 'EDIT' : 'CREATE'" in add_project
    assert "target_project_id: editingProjectId" in add_project
    assert "navigate(`/painel/mrca/${projectId}`)" in add_project
    assert "apiPatch<ProjectResponse>(`/projects/${encodeURIComponent(projectId)}`" in database_service
    assert "createProjectDraft" in project_drafts
    assert "draft_kind" in project_drafts
    assert "target_project_id" in project_drafts
    assert "navigate(`/painel/mrca/${targetId}/editar`)" in overview


def test_frontend_document_contract_exposes_supabase_bucket_metadata() -> None:
    database_service = read("src/services/database.ts")
    project_drafts = read("src/services/projectDrafts.ts")
    project_documents = read("src/services/projectDocuments.ts")

    for source in (database_service, project_drafts, project_documents):
        assert "storageBucket" in source
        assert "storageObjectPath" in source

    assert "storage_bucket" in project_drafts
    assert "storage_object_path" in project_drafts
    assert "storage_bucket" in project_documents
    assert "storage_object_path" in project_documents


def test_public_project_pages_request_only_public_marketplace_ready_projects() -> None:
    database_service = read("src/services/database.ts")
    feed = read("src/pages/Dashboard/Feed.tsx")
    credit_marketplace = read("src/pages/Dashboard/CreditMarketplace.tsx")

    assert "publicMarketplaceOnly?: boolean" in database_service
    assert "portfolioOnly?: boolean" in database_service
    assert "ownedOnly = false" in database_service
    assert "public_marketplace', 'true'" in database_service
    assert "portfolio_only', 'true'" in database_service
    assert "getProjectsFromApi({ publicMarketplaceOnly, ownedOnly, portfolioOnly })" in database_service
    assert "PROJECT_STATUS_PRESENTATION" in database_service
    assert "Em análise" in database_service
    assert "let statusIcon = 'Ativo'" not in database_service
    assert "publicMarketplaceOnly: !isProducerAccount" in feed
    assert "ownedOnly: isProducerAccount" in feed
    assert "portfolioOnly: isProducerAccount" in feed
    assert "project.lifecycleStatus" in feed
    assert "Projetos públicos prontos para marketplace" in feed
    assert "Projetos salvos e publicados da sua organização produtora." in feed
    assert "max-w-7xl" in feed
    assert "px-4" in feed
    assert "apiGet<any>('/marketplace')" in credit_marketplace


def test_project_cards_and_dossier_render_canonical_lifecycle() -> None:
    database_service = read("src/services/database.ts")
    project_card = read("src/components/ProjectCardMRCA.tsx")
    lifecycle_component = read("src/components/ProjectLifecycleTimeline.tsx")
    details = read("src/pages/Dashboard/MrcaDetails.tsx")

    assert "currentLifecycleStage: proj.currentLifecycleStage" in database_service
    assert "lifecycle: proj.lifecycle" in database_service
    assert "ProjectLifecycleTimeline" in project_card
    assert "ProjectLifecycleTimeline" in details
    assert "Etapa atual" in lifecycle_component
    assert "CREATED" in lifecycle_component
    assert "AVAILABLE" in lifecycle_component
    assert "Eventos registrados" in details


# ----------------------------------------------------------------------
# Phase 04.2 Plan 05: vocabulario publico de integridade (INTG-05, D-16/D-17)
# ----------------------------------------------------------------------

def test_public_dossier_renders_integrity_vocabulary() -> None:
    details = read("src/pages/Dashboard/MrcaDetails.tsx")

    assert "integrityStatusLabel" in details
    for label in ("'Declarado'", "'Verificado'", "'Em análise'", "'Em retenção'", "'Suspenso'", "'Revogado'"):
        assert label in details


def test_public_dossier_shows_integrity_next_to_operational_status() -> None:
    details = read("src/pages/Dashboard/MrcaDetails.tsx")

    assert "Integridade: {integrityStatusLabel(" in details
    assert "statusLabel(project.status)" in details


def test_public_dossier_never_renders_bare_certified_badge() -> None:
    details = read("src/pages/Dashboard/MrcaDetails.tsx")

    assert "Certified" not in details
    assert "SINARCA VERIFIED" not in details


def test_public_dossier_renders_risk_explanation() -> None:
    details = read("src/pages/Dashboard/MrcaDetails.tsx")

    assert "signal.reason" in details
    assert "riskClassLabel" in details


def test_database_service_types_public_integrity() -> None:
    database_service = read("src/services/database.ts")

    assert "ProjectIntegrityPayload" in database_service
    assert "integrity: ProjectIntegrityPayload | null;" in database_service
