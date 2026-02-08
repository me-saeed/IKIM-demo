'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { medicationRequestService, MedicationRequest } from '@/lib/services/medicationrequest-service'
import { patientService, Patient } from '@/lib/services/patient-service'
import { conditionService, Condition } from '@/lib/services/condition-service'
import { encounterService, Encounter } from '@/lib/services/encounter-service'

export default function MedicationRequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  const [medicationRequest, setMedicationRequest] = useState<MedicationRequest | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [conditions, setConditions] = useState<Condition[]>([])
  const [encounter, setEncounter] = useState<Encounter | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (requestId) {
      loadMedicationRequest()
    }
  }, [requestId])

  const loadMedicationRequest = async () => {
    try {
      const data = await medicationRequestService.getById(requestId)
      setMedicationRequest(data)

      // Load patient if reference exists
      const patientRef = data.subject?.reference
      if (patientRef) {
        const patientId = patientRef.split('/')[1]
        try {
          const patientData = await patientService.getById(patientId)
          setPatient(patientData)
        } catch (error) {
          console.error('Error loading patient:', error)
        }
      }

      // Load conditions if references exist
      if (data.reasonReference && data.reasonReference.length > 0) {
        const conditionPromises = data.reasonReference
          .map(ref => {
            const conditionId = ref.reference?.split('/')[1]
            return conditionId ? conditionService.getById(conditionId).catch(() => null) : null
          })
          .filter(Boolean)
        const conditionData = await Promise.all(conditionPromises)
        setConditions(conditionData.filter(Boolean) as Condition[])
      }

      // Load encounter if reference exists
      const encounterRef = data.encounter?.reference
      if (encounterRef) {
        const encounterId = encounterRef.split('/')[1]
        try {
          const encounterData = await encounterService.getById(encounterId)
          setEncounter(encounterData)
        } catch (error) {
          console.error('Error loading encounter:', error)
        }
      }
    } catch (error) {
      console.error('Error loading medication request:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!confirm('Mark this prescription as completed?')) {
      return
    }

    try {
      await medicationRequestService.complete(requestId)
      loadMedicationRequest() // Reload to show updated status
    } catch (error) {
      console.error('Error completing prescription:', error)
      alert('Failed to complete prescription. Please try again.')
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this prescription?')) {
      return
    }

    try {
      await medicationRequestService.cancel(requestId)
      loadMedicationRequest() // Reload to show updated status
    } catch (error) {
      console.error('Error canceling prescription:', error)
      alert('Failed to cancel prescription. Please try again.')
    }
  }

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800'
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800'
      case 'stopped':
        return 'bg-orange-100 text-orange-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority?: string) => {
    if (!priority) return 'bg-gray-100 text-gray-800'
    switch (priority.toLowerCase()) {
      case 'stat':
        return 'bg-red-100 text-red-800'
      case 'asap':
        return 'bg-orange-100 text-orange-800'
      case 'urgent':
        return 'bg-yellow-100 text-yellow-800'
      case 'routine':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const getMedicationName = () => {
    if (!medicationRequest) return 'Medication'
    if (medicationRequest.medicationReference?.display) {
      return medicationRequest.medicationReference.display
    }
    if (medicationRequest.medicationCodeableConcept?.text) {
      return medicationRequest.medicationCodeableConcept.text
    }
    if (medicationRequest.medicationCodeableConcept?.coding?.[0]?.display) {
      return medicationRequest.medicationCodeableConcept.coding[0].display
    }
    return 'Medication'
  }

  const getPatientName = (): string => {
    if (!patient) return 'Unknown Patient'
    const given = patient.name?.[0]?.given?.join(' ') || ''
    const family = patient.name?.[0]?.family || ''
    return `${given} ${family}`.trim() || 'Patient'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading prescription...</div>
      </div>
    )
  }

  if (!medicationRequest) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Prescription not found</p>
        <Link href="/medicationrequests" className="text-blue-600 hover:text-blue-700">
          ← Back to Prescriptions
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/medicationrequests" className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-flex items-center gap-1">
            <span>←</span> Back to Prescriptions
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-4xl">💊</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{getMedicationName()}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(medicationRequest.status)}`}>
                  {medicationRequest.status || 'Unknown'}
                </span>
                {medicationRequest.priority && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(medicationRequest.priority)}`}>
                    {medicationRequest.priority.toUpperCase()}
                  </span>
                )}
                {medicationRequest.intent && (
                  <span className="px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800">
                    {medicationRequest.intent}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {medicationRequest.status === 'active' && (
            <>
              <button
                onClick={handleComplete}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
              >
                Mark Complete
              </button>
              <button
                onClick={handleCancel}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prescription Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Prescription Details</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Medication</dt>
                <dd className="text-sm text-gray-900 mt-1">{getMedicationName()}</dd>
              </div>
              {medicationRequest.dosageInstruction && medicationRequest.dosageInstruction.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Dosage Instructions</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {medicationRequest.dosageInstruction.map((dosage, index) => (
                      <div key={index} className="mb-2">
                        {dosage.text && <p className="font-medium">{dosage.text}</p>}
                        {dosage.route && (
                          <p className="text-xs text-gray-600">
                            Route: {dosage.route.text || dosage.route.coding?.[0]?.display}
                          </p>
                        )}
                        {dosage.doseAndRate && dosage.doseAndRate[0]?.doseQuantity && (
                          <p className="text-xs text-gray-600">
                            Dose: {dosage.doseAndRate[0].doseQuantity.value} {dosage.doseAndRate[0].doseQuantity.unit}
                          </p>
                        )}
                        {dosage.timing?.repeat && (
                          <p className="text-xs text-gray-600">
                            Frequency: {dosage.timing.repeat.frequency} times per {dosage.timing.repeat.period} {dosage.timing.repeat.periodUnit}
                          </p>
                        )}
                      </div>
                    ))}
                  </dd>
                </div>
              )}
              {medicationRequest.authoredOn && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Prescribed On</dt>
                  <dd className="text-sm text-gray-900 mt-1">{formatDate(medicationRequest.authoredOn)}</dd>
                </div>
              )}
              {medicationRequest.requester?.display && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Prescribed By</dt>
                  <dd className="text-sm text-gray-900 mt-1">{medicationRequest.requester.display}</dd>
                </div>
              )}
              {medicationRequest.note && medicationRequest.note.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {medicationRequest.note.map((note, index) => (
                      <p key={index} className="mb-1">{note.text}</p>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Dispense Information */}
          {medicationRequest.dispenseRequest && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Dispense Information</h2>
              <dl className="space-y-4">
                {medicationRequest.dispenseRequest.quantity && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Quantity</dt>
                    <dd className="text-sm text-gray-900 mt-1">
                      {medicationRequest.dispenseRequest.quantity.value} {medicationRequest.dispenseRequest.quantity.unit}
                    </dd>
                  </div>
                )}
                {medicationRequest.dispenseRequest.numberOfRepeatsAllowed !== undefined && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Number of Repeats Allowed</dt>
                    <dd className="text-sm text-gray-900 mt-1">{medicationRequest.dispenseRequest.numberOfRepeatsAllowed}</dd>
                  </div>
                )}
                {medicationRequest.dispenseRequest.expectedSupplyDuration && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Expected Supply Duration</dt>
                    <dd className="text-sm text-gray-900 mt-1">
                      {medicationRequest.dispenseRequest.expectedSupplyDuration.value} {medicationRequest.dispenseRequest.expectedSupplyDuration.unit}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Right Column - Related Information */}
        <div className="space-y-6">
          {/* Patient Information */}
          {patient && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Patient</h2>
              <Link
                href={`/patients/${patient.id}`}
                className="block p-3 rounded-lg hover:bg-gray-50 transition border-l-4 border-blue-500"
              >
                <p className="font-medium text-gray-900">{getPatientName()}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {patient.gender} • {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString() : 'N/A'}
                </p>
              </Link>
            </div>
          )}

          {/* Encounter Information */}
          {encounter && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Encounter</h2>
              <Link
                href={`/encounters/${encounter.id}`}
                className="block p-3 rounded-lg hover:bg-gray-50 transition border-l-4 border-indigo-500"
              >
                <p className="font-medium text-gray-900">
                  {encounter.class?.display || 'Encounter'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {encounter.period?.start ? formatDate(encounter.period.start) : 'N/A'}
                </p>
                <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                  encounter.status === 'finished' ? 'bg-green-100 text-green-800' :
                  encounter.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {encounter.status}
                </span>
              </Link>
            </div>
          )}

          {/* Related Conditions */}
          {conditions.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Related Conditions</h2>
              <div className="space-y-2">
                {conditions.map((condition) => (
                  <Link
                    key={condition.id}
                    href={`/conditions/${condition.id}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 transition border-l-4 border-red-500"
                  >
                    <p className="font-medium text-gray-900">
                      {condition.code?.text || condition.code?.coding?.[0]?.display || 'Condition'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {condition.clinicalStatus?.coding?.[0]?.display || condition.clinicalStatus?.text || 'Unknown'}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

