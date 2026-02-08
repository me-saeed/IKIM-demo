/**
 * DiagnosticReport Service
 * Handles DiagnosticReport FHIR resource operations
 */

import apiClient from '../api-client';

export interface DiagnosticReport {
  resourceType: 'DiagnosticReport';
  id?: string;
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
  code: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  encounter?: {
    reference: string;
    display?: string;
  };
  effectiveDateTime?: string;
  effectivePeriod?: {
    start?: string;
    end?: string;
  };
  issued?: string;
  performer?: Array<{
    reference?: string;
    display?: string;
  }>;
  resultsInterpreter?: Array<{
    reference?: string;
    display?: string;
  }>;
  specimen?: Array<{
    reference: string;
    display?: string;
  }>;
  result?: Array<{
    reference: string;
    display?: string;
  }>;
  imagingStudy?: Array<{
    reference: string;
    display?: string;
  }>;
  media?: Array<{
    comment?: string;
    link: {
      reference: string;
      display?: string;
    };
  }>;
  conclusion?: string;
  conclusionCode?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
  presentedForm?: Array<{
    contentType?: string;
    language?: string;
    data?: string;
    url?: string;
    title?: string;
  }>;
  note?: Array<{
    text?: string;
    authorString?: string;
    time?: string;
  }>;
}

export interface DiagnosticReportSearchFilters {
  patient?: string;
  status?: string;
  category?: string;
  code?: string;
  date?: string;
  _count?: number;
}

export const diagnosticReportService = {
  /**
   * Search for diagnostic reports
   */
  async search(filters: DiagnosticReportSearchFilters = {}): Promise<DiagnosticReport[]> {
    const params = new URLSearchParams();
    
    if (filters.patient) params.append('subject', filters.patient);
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    if (filters.code) params.append('code', filters.code);
    if (filters.date) params.append('date', filters.date);
    if (filters._count) params.append('_count', filters._count.toString());
    
    const response = await apiClient.get(`/fhir/DiagnosticReport?${params.toString()}`);
    return response.data.entry?.map((entry: any) => entry.resource) || [];
  },

  /**
   * Get diagnostic reports for a specific patient
   */
  async getByPatient(patientId: string): Promise<DiagnosticReport[]> {
    return this.search({ patient: `Patient/${patientId}`, _count: 50 });
  },

  /**
   * Get diagnostic report by ID
   */
  async getById(reportId: string): Promise<DiagnosticReport> {
    const response = await apiClient.get(`/fhir/DiagnosticReport/${reportId}`);
    return response.data;
  },

  /**
   * Create a new diagnostic report
   */
  async create(reportData: Partial<DiagnosticReport>): Promise<DiagnosticReport> {
    // Build code object - ensure at least text or coding is present
    const codeObj: any = {}
    if (reportData.code?.text) {
      codeObj.text = reportData.code.text
    }
    if (reportData.code?.coding && reportData.code.coding.length > 0) {
      codeObj.coding = reportData.code.coding
    }
    // If no code provided, use default
    if (!codeObj.text && !codeObj.coding) {
      codeObj.text = 'Diagnostic Report'
    }

    // Validate required fields
    if (!reportData.subject) {
      throw new Error('Subject (patient) is required for DiagnosticReport')
    }

    // Build the report object, only including defined fields
    const fhirReport: any = {
      resourceType: 'DiagnosticReport',
      status: reportData.status || 'final',
      code: codeObj,
      subject: reportData.subject,
    }

    // Optional fields - only add if they have values
    if (reportData.category && reportData.category.length > 0) {
      fhirReport.category = reportData.category
    }
    if (reportData.encounter) {
      fhirReport.encounter = reportData.encounter
    }
    if (reportData.effectiveDateTime) {
      fhirReport.effectiveDateTime = reportData.effectiveDateTime
    }
    if (reportData.effectivePeriod) {
      fhirReport.effectivePeriod = reportData.effectivePeriod
    }
    if (reportData.issued) {
      fhirReport.issued = reportData.issued
    } else {
      fhirReport.issued = new Date().toISOString()
    }
    if (reportData.performer && reportData.performer.length > 0) {
      fhirReport.performer = reportData.performer
    }
    if (reportData.resultsInterpreter && reportData.resultsInterpreter.length > 0) {
      fhirReport.resultsInterpreter = reportData.resultsInterpreter
    }
    if (reportData.specimen && reportData.specimen.length > 0) {
      fhirReport.specimen = reportData.specimen
    }
    if (reportData.result && reportData.result.length > 0) {
      fhirReport.result = reportData.result
    }
    if (reportData.imagingStudy && reportData.imagingStudy.length > 0) {
      fhirReport.imagingStudy = reportData.imagingStudy
    }
    if (reportData.media && reportData.media.length > 0) {
      fhirReport.media = reportData.media
    }
    if (reportData.conclusion) {
      fhirReport.conclusion = reportData.conclusion
    }
    if (reportData.conclusionCode && reportData.conclusionCode.length > 0) {
      fhirReport.conclusionCode = reportData.conclusionCode
    }
    if (reportData.presentedForm && reportData.presentedForm.length > 0) {
      fhirReport.presentedForm = reportData.presentedForm
    }
    // Note: The API doesn't support 'note' field on DiagnosticReport
    // Use 'conclusion' field instead for additional notes/comments

    const response = await apiClient.post('/fhir/DiagnosticReport', fhirReport);
    return response.data;
  },

  /**
   * Update a diagnostic report
   */
  async update(reportId: string, updates: Partial<DiagnosticReport>): Promise<DiagnosticReport> {
    const current = await this.getById(reportId);
    const updated: DiagnosticReport = {
      ...current,
      ...updates,
      id: reportId,
    };

    const response = await apiClient.put(`/fhir/DiagnosticReport/${reportId}`, updated);
    return response.data;
  },

  /**
   * Amend a diagnostic report
   */
  async amend(reportId: string, updates: Partial<DiagnosticReport>): Promise<DiagnosticReport> {
    return this.update(reportId, {
      status: 'amended',
      ...updates,
    });
  },
};

