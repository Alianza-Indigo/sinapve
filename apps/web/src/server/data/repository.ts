import { nanoid } from "nanoid";
import { reports, cases } from "./demo";
import { suggestSeverity } from "../domain/protocols";
import type { HelpReport, ReportMode } from "../domain/types";

export async function listReports() {
  return reports;
}

export async function listCases() {
  return cases;
}

export async function getReportStatus(reportId: string) {
  const report = reports.find((item) => item.id === reportId || item.folio === reportId);
  if (!report) return null;
  return {
    folio: report.folio,
    status: report.status,
    createdAt: report.createdAt,
    safeMessage: "Tu solicitud esta registrada. Usa el folio para dar seguimiento sin revelar datos sensibles."
  };
}

export async function getCase(caseId: string) {
  return cases.find((item) => item.id === caseId || item.folio === caseId) ?? null;
}

export async function createReport(input: {
  mode: ReportMode;
  reporterType: HelpReport["reporterType"];
  schoolName: string;
  description: string;
  safetyNow: HelpReport["safetyNow"];
}) {
  const id = `rep_${nanoid(10)}`;
  const report: HelpReport = {
    id,
    folio: `SNPV-${nanoid(4).toUpperCase()}-${nanoid(4).toUpperCase()}`,
    mode: input.mode,
    reporterType: input.reporterType,
    organizationId: "org_secundaria_norte",
    schoolName: input.schoolName,
    municipality: "CUU",
    state: "CHH",
    description: input.description,
    safetyNow: input.safetyNow,
    createdAt: new Date().toISOString(),
    status: "recibido",
    suggestedSeverity: suggestSeverity(input.description, input.safetyNow),
    aiConfidence: undefined
  };

  return report;
}
