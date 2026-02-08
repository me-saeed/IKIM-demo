/**
 * MedicationRequest Service
 * Handles MedicationRequest FHIR resource operations (Prescriptions)
 */

import apiClient from '../api-client';
import type { MedicationRequest, MedicationRequestSearchFilters } from './medicationrequest-types';

export type { MedicationRequest, MedicationRequestSearchFilters };

export const medicationRequestService = {
  /**
   * Search for medication requests
   */
  async search(filters: MedicationRequestSearchFilters = {}): Promise<MedicationRequest[]> {
    const params = new URLSearchParams();
    
    if (filters.patient) params.append('subject', filters.patient);
    if (filters.status) params.append('status', filters.status);
    if (filters.intent) params.append('intent', filters.intent);
    if (filters.medication) params.append('medication', filters.medication);
    if (filters._count) params.append('_count', filters._count.toString());
    
    const response = await apiClient.get(`/fhir/MedicationRequest?${params.toString()}`);
    return response.data.entry?.map((entry: any) => entry.resource) || [];
  },

  /**
   * Get medication requests for a specific patient
   */
  async getByPatient(patientId: string): Promise<MedicationRequest[]> {
    return this.search({ patient: `Patient/${patientId}`, _count: 50 });
  },

  /**
   * Get medication request by ID
   */
  async getById(medicationRequestId: string): Promise<MedicationRequest> {
    const response = await apiClient.get(`/fhir/MedicationRequest/${medicationRequestId}`);
    return response.data;
  },

  /**
   * Create a new medication request
   */
  async create(medicationRequestData: Partial<MedicationRequest>): Promise<MedicationRequest> {
    if (!medicationRequestData.subject) {
      throw new Error('Subject (patient) is required for MedicationRequest');
    }

    const fhirRequest: any = {
      resourceType: 'MedicationRequest',
      status: medicationRequestData.status || 'active',
      intent: medicationRequestData.intent || 'order',
      subject: medicationRequestData.subject,
    };

    if (medicationRequestData.medicationReference) {
      fhirRequest.medicationReference = medicationRequestData.medicationReference;
    } else if (medicationRequestData.medicationCodeableConcept) {
      fhirRequest.medicationCodeableConcept = medicationRequestData.medicationCodeableConcept;
    }

    if (medicationRequestData.category && medicationRequestData.category.length > 0) {
      fhirRequest.category = medicationRequestData.category;
    }
    if (medicationRequestData.priority) {
      fhirRequest.priority = medicationRequestData.priority;
    }
    if (medicationRequestData.encounter) {
      fhirRequest.encounter = medicationRequestData.encounter;
    }
    if (medicationRequestData.authoredOn) {
      fhirRequest.authoredOn = medicationRequestData.authoredOn;
    } else {
      fhirRequest.authoredOn = new Date().toISOString();
    }
    if (medicationRequestData.requester) {
      fhirRequest.requester = medicationRequestData.requester;
    }
    if (medicationRequestData.performer) {
      fhirRequest.performer = medicationRequestData.performer;
    }
    if (medicationRequestData.reasonCode && medicationRequestData.reasonCode.length > 0) {
      fhirRequest.reasonCode = medicationRequestData.reasonCode;
    }
    if (medicationRequestData.reasonReference && medicationRequestData.reasonReference.length > 0) {
      fhirRequest.reasonReference = medicationRequestData.reasonReference;
    }
    if (medicationRequestData.dosageInstruction && medicationRequestData.dosageInstruction.length > 0) {
      fhirRequest.dosageInstruction = medicationRequestData.dosageInstruction;
    }
    if (medicationRequestData.dispenseRequest) {
      fhirRequest.dispenseRequest = medicationRequestData.dispenseRequest;
    }
    if (medicationRequestData.substitution) {
      fhirRequest.substitution = medicationRequestData.substitution;
    }
    if (medicationRequestData.note && medicationRequestData.note.length > 0) {
      fhirRequest.note = medicationRequestData.note;
    }

    const response = await apiClient.post('/fhir/MedicationRequest', fhirRequest);
    return response.data;
  },

  /**
   * Update a medication request
   */
  async update(medicationRequestId: string, updates: Partial<MedicationRequest>): Promise<MedicationRequest> {
    const current = await this.getById(medicationRequestId);
    const updated: MedicationRequest = {
      ...current,
      ...updates,
      id: medicationRequestId,
    };

    const response = await apiClient.put(`/fhir/MedicationRequest/${medicationRequestId}`, updated);
    return response.data;
  },

  /**
   * Cancel a medication request
   */
  async cancel(medicationRequestId: string): Promise<MedicationRequest> {
    return this.update(medicationRequestId, {
      status: 'cancelled',
    });
  },

  /**
   * Complete a medication request
   */
  async complete(medicationRequestId: string): Promise<MedicationRequest> {
    return this.update(medicationRequestId, {
      status: 'completed',
    });
  },
};
