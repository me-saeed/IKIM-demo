export interface MedicationRequest {
  resourceType: 'MedicationRequest';
  id?: string;
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  category?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  medicationReference?: {
    reference: string;
    display?: string;
  };
  medicationCodeableConcept?: {
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
  authoredOn?: string;
  requester?: {
    reference: string;
    display?: string;
  };
  performer?: {
    reference: string;
    display?: string;
  };
  reasonCode?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
  reasonReference?: Array<{
    reference: string;
    display?: string;
  }>;
  dosageInstruction?: Array<{
    text?: string;
    timing?: {
      repeat?: {
        frequency?: number;
        period?: number;
        periodUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
      };
    };
    route?: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
      text?: string;
    };
    doseAndRate?: Array<{
      doseQuantity?: {
        value?: number;
        unit?: string;
      };
    };
  }>;
  dispenseRequest?: {
    numberOfRepeatsAllowed?: number;
    quantity?: {
      value?: number;
      unit?: string;
    };
    expectedSupplyDuration?: {
      value?: number;
      unit?: string;
    };
  };
  substitution?: {
    allowed: boolean;
    reason?: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
      text?: string;
    };
  };
  note?: Array<{
    text?: string;
    time?: string;
    authorString?: string;
  }>;
}

export interface MedicationRequestSearchFilters {
  patient?: string;
  status?: string;
  intent?: string;
  medication?: string;
  _count?: number;
}

