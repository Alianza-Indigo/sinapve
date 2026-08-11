import type { Actor, CaseFile, HelpReport, Organization } from "../domain/types";

export const demoActor: Actor = {
  id: "usr_apve_001",
  name: "Marisol Rivas",
  roles: ["APVE", "SCHOOL_DIRECTOR"],
  scope: {
    organizationId: "org_secundaria_norte",
    stateCode: "CHH",
    municipalityCode: "CUU",
    schoolId: "sch_secundaria_norte",
    assignedCaseIds: ["case_001", "case_002"]
  },
  mfaVerified: true
};

export const organizations: Organization[] = [
  { id: "org_federal", name: "Unidad Nacional SINAPVE", type: "federal" },
  { id: "org_chh", name: "UEPE Chihuahua", type: "state", parentId: "org_federal", stateCode: "CHH" },
  {
    id: "org_cuu",
    name: "CMCE Chihuahua",
    type: "municipality",
    parentId: "org_chh",
    stateCode: "CHH",
    municipalityCode: "CUU"
  },
  {
    id: "org_secundaria_norte",
    name: "Secundaria Norte Turno Matutino",
    type: "school",
    parentId: "org_cuu",
    stateCode: "CHH",
    municipalityCode: "CUU"
  }
];

export const reports: HelpReport[] = [
  {
    id: "rep_001",
    folio: "SNPV-8M2Q-4K7D",
    mode: "anonimo",
    reporterType: "estudiante",
    organizationId: "org_secundaria_norte",
    schoolName: "Secundaria Norte",
    municipality: "CUU",
    state: "CHH",
    description: "Un grupo comparte fotos y amenazas en un chat fuera de clase.",
    safetyNow: "riesgo",
    createdAt: "2026-08-10T16:12:00Z",
    status: "convertido_caso",
    suggestedSeverity: "grave",
    aiConfidence: 0.82
  },
  {
    id: "rep_002",
    folio: "SNPV-3HD9-T2QA",
    mode: "confidencial",
    reporterType: "familia",
    organizationId: "org_secundaria_norte",
    schoolName: "Secundaria Norte",
    municipality: "CUU",
    state: "CHH",
    description: "Mi hija pidio no entrar al recreo por burlas repetidas.",
    safetyNow: "segura",
    createdAt: "2026-08-10T17:04:00Z",
    status: "en_triaje",
    suggestedSeverity: "moderada",
    aiConfidence: 0.74
  },
  {
    id: "rep_003",
    folio: "SNPV-Q6NP-9V2C",
    mode: "identificado",
    reporterType: "personal",
    organizationId: "org_secundaria_norte",
    schoolName: "Secundaria Norte",
    municipality: "CUU",
    state: "CHH",
    description: "Se observa aislamiento y llanto frecuente despues de clase.",
    safetyNow: "segura",
    createdAt: "2026-08-10T17:45:00Z",
    status: "recibido",
    suggestedSeverity: "leve",
    aiConfidence: 0.61
  }
];

export const cases: CaseFile[] = [
  {
    id: "case_001",
    folio: "CASO-CHH-2026-0042",
    reportId: "rep_001",
    organizationId: "org_secundaria_norte",
    title: "Amenazas digitales contra estudiante",
    state: "activo",
    parallelStates: ["proteccion_activa"],
    severity: "grave",
    assignedTo: "Marisol Rivas",
    firstResponseMinutes: 11,
    slaMinutes: 30,
    protectionSummary: "Contacto seguro confirmado. Sin notificacion insegura a presunto agresor.",
    timeline: [
      {
        id: "evt_001",
        at: "2026-08-10T16:12:00Z",
        actor: "Reportante anonimo",
        title: "Reporte recibido",
        detail: "Se genero folio opaco y buzon seguro.",
        audit: true
      },
      {
        id: "evt_002",
        at: "2026-08-10T16:23:00Z",
        actor: "APVE",
        title: "Primera accion protectora",
        detail: "Se separo el contacto inseguro y se abrio triaje.",
        audit: true
      },
      {
        id: "evt_003",
        at: "2026-08-10T16:40:00Z",
        actor: "Direccion",
        title: "Expediente activo",
        detail: "Protocolo escolar de violencia digital iniciado.",
        audit: true
      }
    ]
  },
  {
    id: "case_002",
    folio: "CASO-CHH-2026-0043",
    reportId: "rep_002",
    organizationId: "org_secundaria_norte",
    title: "Burlas repetidas en recreo",
    state: "en_triaje",
    parallelStates: ["calidad_pendiente"],
    severity: "moderada",
    assignedTo: "Marisol Rivas",
    firstResponseMinutes: 24,
    slaMinutes: 45,
    protectionSummary: "Pendiente confirmar ajustes razonables y red de apoyo.",
    timeline: [
      {
        id: "evt_004",
        at: "2026-08-10T17:04:00Z",
        actor: "Familiar",
        title: "Solicitud confidencial",
        detail: "Identidad visible solo para perfiles autorizados.",
        audit: true
      },
      {
        id: "evt_005",
        at: "2026-08-10T17:28:00Z",
        actor: "APVE",
        title: "Triaje inicial",
        detail: "Se agenda entrevista cuidadosa sin repetir relato innecesario.",
        audit: true
      }
    ]
  },
  {
    id: "case_003",
    folio: "CASO-CHH-2026-0038",
    reportId: "rep_000",
    organizationId: "org_secundaria_norte",
    title: "Seguimiento de plan individual",
    state: "en_seguimiento",
    parallelStates: [],
    severity: "leve",
    assignedTo: "Equipo UAT",
    firstResponseMinutes: 36,
    slaMinutes: 60,
    protectionSummary: "Plan individual activo con revision semanal.",
    timeline: [
      {
        id: "evt_006",
        at: "2026-07-30T15:00:00Z",
        actor: "UAT",
        title: "Plan iniciado",
        detail: "Acuerdos y apoyos documentados.",
        audit: true
      }
    ]
  }
];
