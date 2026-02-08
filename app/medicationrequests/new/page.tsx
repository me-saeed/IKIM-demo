'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { medicationRequestService } from '@/lib/services/medicationrequest-service'
import { patientService, Patient } from '@/lib/services/patient-service'
import { encounterService, Encounter } from '@/lib/services/encounter-service'
import { conditionService, Condition } from '@/lib/services/condition-service'
import { getProfileId } from '@/lib/auth'

function NewMedicationRequestContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientIdFromQuery = searchParams.get('patientId')
  const conditionIdFromQuery = searchParams.get('conditionId')
  
  const [patients, setPatients] = useState<Patient[]>([])
  const [conditions, setConditions] = useState<Condition[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    patientId: patientIdFromQuery || '',
    conditionId: conditionIdFromQuery || '',
    encounterId: '',
    medicationName: '',
    medicationCode: '',
    status: 'active' as 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown',
    intent: 'order' as 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option',
    priority: 'routine' as 'routine' | 'urgent' | 'asap' | 'stat',
    dosageText: '',
    dosageFrequency: '',
    dosagePeriod: '1',
    dosagePeriodUnit: 'd' as 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a',
    dosageRoute: '',
    doseValue: '',
    doseUnit: '',
    quantityValue: '',
    quantityUnit: '',
    numberOfRepeats: '',
    note: '',
  })

  useEffect(() => {
    loadPatients()
    if (patientIdFromQuery) {
      loadConditions(patientIdFromQuery)
      loadEncounters(patientIdFromQuery)
    }
  }, [])

  useEffect(() => {
    if (formData.patientId) {
      loadConditions(formData.patientId)
      loadEncounters(formData.patientId)
    } else {
      setConditions([])
      setEncounters([])
    }
  }, [formData.patientId])

  const loadPatients = async () => {
    try {
      const data = await patientService.search({ _count: 100 })
      setPatients(data)
      if (patientIdFromQuery && !formData.patientId) {
        setFormData(prev => ({ ...prev, patientId: patientIdFromQuery }))
      }
    } catch (error) {
      console.error('Error loading patients:', error)
    } finally {
      setLoadingPatients(false)
    }
  }

  const loadConditions = async (patientId: string) => {
    try {
      const data = await conditionService.getByPatient(patientId)
      setConditions(data)
      if (conditionIdFromQuery && !formData.conditionId) {
        setFormData(prev => ({ ...prev, conditionId: conditionIdFromQuery }))
      }
    } catch (error) {
      console.error('Error loading conditions:', error)
    }
  }

  const loadEncounters = async (patientId: string) => {
    try {
      const data = await encounterService.getByPatient(patientId)
      setEncounters(data)
    } catch (error) {
      console.error('Error loading encounters:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const profileId = getProfileId()

      // Build dosage instruction
      const dosageInstruction: any = {}
      if (formData.dosageText) {
        dosageInstruction.text = formData.dosageText
      }
      if (formData.dosageFrequency || formData.dosagePeriod) {
        dosageInstruction.timing = {
          repeat: {}
        }
        if (formData.dosageFrequency) {
          dosageInstruction.timing.repeat.frequency = parseInt(formData.dosageFrequency)
        }
        if (formData.dosagePeriod) {
          dosageInstruction.timing.repeat.period = parseInt(formData.dosagePeriod)
          dosageInstruction.timing.repeat.periodUnit = formData.dosagePeriodUnit
        }
      }
      if (formData.dosageRoute) {
        dosageInstruction.route = {
          text: formData.dosageRoute,
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration',
            code: formData.dosageRoute.toLowerCase().replace(/\s+/g, '-'),
            display: formData.dosageRoute,
          }]
        }
      }
      if (formData.doseValue) {
        dosageInstruction.doseAndRate = [{
          doseQuantity: {
            value: parseFloat(formData.doseValue),
            unit: formData.doseUnit || 'unit',
          }
        }]
      }

      // Build medication codeable concept
      const medicationCodeableConcept: any = {
        text: formData.medicationName,
      }
      if (formData.medicationCode) {
        medicationCodeableConcept.coding = [{
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: formData.medicationCode,
          display: formData.medicationName,
        }]
      }

      // Build dispense request
      const dispenseRequest: any = {}
      if (formData.quantityValue) {
        dispenseRequest.quantity = {
          value: parseFloat(formData.quantityValue),
          unit: formData.quantityUnit || 'unit',
        }
      }
      if (formData.numberOfRepeats) {
        dispenseRequest.numberOfRepeatsAllowed = parseInt(formData.numberOfRepeats)
      }

      const medicationRequest = await medicationRequestService.create({
        status: formData.status,
        intent: formData.intent,
        priority: formData.priority,
        medicationCodeableConcept: medicationCodeableConcept,
        subject: {
          reference: `Patient/${formData.patientId}`,
        },
        encounter: formData.encounterId ? {
          reference: `Encounter/${formData.encounterId}`,
        } : undefined,
        authoredOn: new Date().toISOString(),
        requester: profileId ? {
          reference: `Practitioner/${profileId}`,
        } : undefined,
        reasonReference: formData.conditionId ? [{
          reference: `Condition/${formData.conditionId}`,
        }] : undefined,
        dosageInstruction: Object.keys(dosageInstruction).length > 0 ? [dosageInstruction] : undefined,
        dispenseRequest: Object.keys(dispenseRequest).length > 0 ? dispenseRequest : undefined,
        note: formData.note ? [{
          text: formData.note,
          time: new Date().toISOString(),
          authorString: 'Practitioner',
        }] : undefined,
      })

      router.push(`/medicationrequests/${medicationRequest.id}`)
    } catch (error: any) {
      console.error('Error creating medication request:', error)
      const errorMessage = error.response?.data?.issue?.[0]?.details?.text || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to create prescription. Please check all required fields.'
      alert(`Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const getPatientDisplayName = (patient: Patient): string => {
    const given = patient.name?.[0]?.given?.join(' ') || ''
    const family = patient.name?.[0]?.family || ''
    return `${given} ${family}`.trim() || `Patient ${patient.id?.substring(0, 8)}`
  }

  const getConditionDisplay = (condition: Condition): string => {
    return condition.code?.text || condition.code?.coding?.[0]?.display || 'Condition'
  }

  const getEncounterDisplay = (encounter: Encounter): string => {
    const date = encounter.period?.start ? new Date(encounter.period.start).toLocaleDateString() : ''
    return `${encounter.class?.display || 'Encounter'} ${date ? `(${date})` : ''}`
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Prescription</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Patient *
          </label>
          {loadingPatients ? (
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
              <span className="text-gray-500 text-sm">Loading patients...</span>
            </div>
          ) : (
            <select
              required
              value={formData.patientId}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value, conditionId: '', encounterId: '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">Select a patient...</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {getPatientDisplayName(patient)}
                  {patient.birthDate && ` (${new Date(patient.birthDate).toLocaleDateString()})`}
                  {patient.gender && ` - ${patient.gender}`}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medication Name *
          </label>
          <input
            type="text"
            required
            value={formData.medicationName}
            onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
            placeholder="e.g., Aspirin 100mg, Lisinopril 10mg"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medication Code (Optional)
          </label>
          <input
            type="text"
            value={formData.medicationCode}
            onChange={(e) => setFormData({ ...formData, medicationCode: e.target.value })}
            placeholder="e.g., RxNorm code"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intent *
            </label>
            <select
              required
              value={formData.intent}
              onChange={(e) => setFormData({ ...formData, intent: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="order">Order</option>
              <option value="plan">Plan</option>
              <option value="proposal">Proposal</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="asap">ASAP</option>
            <option value="stat">STAT</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Condition (Optional)
          </label>
          {formData.patientId ? (
            <select
              value={formData.conditionId}
              onChange={(e) => setFormData({ ...formData, conditionId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">No condition</option>
              {conditions.map((condition) => (
                <option key={condition.id} value={condition.id}>
                  {getConditionDisplay(condition)}
                </option>
              ))}
            </select>
          ) : (
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
              Select a patient first
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Encounter (Optional)
          </label>
          {formData.patientId ? (
            <select
              value={formData.encounterId}
              onChange={(e) => setFormData({ ...formData, encounterId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">No encounter</option>
              {encounters.map((encounter) => (
                <option key={encounter.id} value={encounter.id}>
                  {getEncounterDisplay(encounter)}
                </option>
              ))}
            </select>
          ) : (
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
              Select a patient first
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dosage Instructions</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dosage Description *
              </label>
              <input
                type="text"
                required
                value={formData.dosageText}
                onChange={(e) => setFormData({ ...formData, dosageText: e.target.value })}
                placeholder="e.g., Take 1 tablet twice daily"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.dosageFrequency}
                  onChange={(e) => setFormData({ ...formData, dosageFrequency: e.target.value })}
                  placeholder="e.g., 2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.dosagePeriod}
                  onChange={(e) => setFormData({ ...formData, dosagePeriod: e.target.value })}
                  placeholder="e.g., 1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period Unit
                </label>
                <select
                  value={formData.dosagePeriodUnit}
                  onChange={(e) => setFormData({ ...formData, dosagePeriodUnit: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="d">Day</option>
                  <option value="h">Hour</option>
                  <option value="wk">Week</option>
                  <option value="mo">Month</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Route
                </label>
                <input
                  type="text"
                  value={formData.dosageRoute}
                  onChange={(e) => setFormData({ ...formData, dosageRoute: e.target.value })}
                  placeholder="e.g., Oral, Injection"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dose Value
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.doseValue}
                    onChange={(e) => setFormData({ ...formData, doseValue: e.target.value })}
                    placeholder="e.g., 1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dose Unit
                  </label>
                  <input
                    type="text"
                    value={formData.doseUnit}
                    onChange={(e) => setFormData({ ...formData, doseUnit: e.target.value })}
                    placeholder="e.g., tablet"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dispense Information (Optional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantityValue}
                  onChange={(e) => setFormData({ ...formData, quantityValue: e.target.value })}
                  placeholder="e.g., 30"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <input
                  type="text"
                  value={formData.quantityUnit}
                  onChange={(e) => setFormData({ ...formData, quantityUnit: e.target.value })}
                  placeholder="e.g., tablets"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Repeats Allowed
              </label>
              <input
                type="number"
                min="0"
                value={formData.numberOfRepeats}
                onChange={(e) => setFormData({ ...formData, numberOfRepeats: e.target.value })}
                placeholder="e.g., 3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            rows={3}
            placeholder="Additional notes or instructions..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Prescription'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewMedicationRequestPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <NewMedicationRequestContent />
    </Suspense>
  )
}

