'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { diagnosticReportService } from '@/lib/services/diagnosticreport-service'
import { patientService, Patient } from '@/lib/services/patient-service'
import { encounterService, Encounter } from '@/lib/services/encounter-service'
import { serviceRequestService, ServiceRequest } from '@/lib/services/servicerequest-service'
import { getProfileId } from '@/lib/auth'

function NewDiagnosticReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientIdFromQuery = searchParams.get('patientId')
  const serviceRequestIdFromQuery = searchParams.get('serviceRequestId')
  
  const [patients, setPatients] = useState<Patient[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    patientId: patientIdFromQuery || '',
    encounterId: '',
    serviceRequestId: serviceRequestIdFromQuery || '',
    reportName: '',
    reportCode: '',
    category: 'LAB',
    status: 'final' as 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown',
    effectiveDate: new Date().toISOString().slice(0, 16),
    conclusion: '',
    note: '',
  })

  useEffect(() => {
    loadPatients()
    if (patientIdFromQuery) {
      loadEncounters(patientIdFromQuery)
      loadServiceRequests(patientIdFromQuery)
    }
  }, [])

  useEffect(() => {
    if (formData.patientId) {
      loadEncounters(formData.patientId)
      loadServiceRequests(formData.patientId)
    } else {
      setEncounters([])
      setServiceRequests([])
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

  const loadEncounters = async (patientId: string) => {
    try {
      const data = await encounterService.getByPatient(patientId)
      setEncounters(data)
    } catch (error) {
      console.error('Error loading encounters:', error)
    }
  }

  const loadServiceRequests = async (patientId: string) => {
    try {
      const data = await serviceRequestService.getByPatient(patientId)
      setServiceRequests(data)
      if (serviceRequestIdFromQuery && !formData.serviceRequestId) {
        setFormData(prev => ({ ...prev, serviceRequestId: serviceRequestIdFromQuery }))
      }
    } catch (error) {
      console.error('Error loading service requests:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const profileId = getProfileId()
      const effectiveDate = new Date(formData.effectiveDate)

      // Build code object
      const codeObj: any = {
        text: formData.reportName,
      }
      if (formData.reportCode) {
        codeObj.coding = [{
          system: 'http://loinc.org',
          code: formData.reportCode,
          display: formData.reportName,
        }]
      }

      // Build report data
      const reportData: any = {
        status: formData.status,
        code: codeObj,
        subject: {
          reference: `Patient/${formData.patientId}`,
        },
        effectiveDateTime: effectiveDate.toISOString(),
        issued: new Date().toISOString(),
      }

      // Add optional fields only if they have values
      if (formData.category) {
        reportData.category = [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
            code: formData.category,
            display: formData.category === 'LAB' ? 'Laboratory' :
                    formData.category === 'RAD' ? 'Radiology' :
                    formData.category === 'PATH' ? 'Pathology' :
                    formData.category === 'CUS' ? 'Cardiac Ultrasound' : 'Diagnostic',
          }],
          text: formData.category === 'LAB' ? 'Laboratory' :
                formData.category === 'RAD' ? 'Radiology' :
                formData.category === 'PATH' ? 'Pathology' :
                formData.category === 'CUS' ? 'Cardiac Ultrasound' : 'Diagnostic',
        }]
      }

      if (formData.encounterId) {
        reportData.encounter = {
          reference: `Encounter/${formData.encounterId}`,
        }
      }

      if (profileId) {
        reportData.performer = [{
          reference: `Practitioner/${profileId}`,
        }]
      }

      // Combine conclusion and note into conclusion field
      // (API doesn't support separate 'note' field)
      if (formData.conclusion || formData.note) {
        const conclusionParts = []
        if (formData.conclusion) {
          conclusionParts.push(formData.conclusion)
        }
        if (formData.note) {
          conclusionParts.push(`\n\nNote: ${formData.note}`)
        }
        reportData.conclusion = conclusionParts.join('')
      }

      const report = await diagnosticReportService.create(reportData)

      router.push(`/diagnosticreports/${report.id}`)
    } catch (error: any) {
      console.error('Error creating diagnostic report:', error)
      console.error('Full error response:', JSON.stringify(error.response?.data, null, 2))
      
      // Extract error message from FHIR OperationOutcome
      let errorMessage = 'Failed to create diagnostic report.'
      
      if (error.response?.data?.issue && Array.isArray(error.response.data.issue)) {
        const issues = error.response.data.issue.map((issue: any) => {
          const field = issue.expression?.[0] || ''
          const message = issue.details?.text || issue.diagnostics || issue.code || 'Validation error'
          const severity = issue.severity || 'error'
          return field ? `[${severity}] ${field}: ${message}` : `[${severity}] ${message}`
        })
        errorMessage = issues.join('\n\n')
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      // Show detailed error in alert
      alert(`Error creating diagnostic report:\n\n${errorMessage}\n\nCheck console for full details.`)
    } finally {
      setLoading(false)
    }
  }

  const getPatientDisplayName = (patient: Patient): string => {
    const given = patient.name?.[0]?.given?.join(' ') || ''
    const family = patient.name?.[0]?.family || ''
    return `${given} ${family}`.trim() || `Patient ${patient.id?.substring(0, 8)}`
  }

  const categories = [
    { code: 'LAB', display: 'Laboratory' },
    { code: 'RAD', display: 'Radiology' },
    { code: 'PATH', display: 'Pathology' },
    { code: 'CUS', display: 'Cardiac Ultrasound' },
  ]

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">New Diagnostic Report</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Patient *
          </label>
          {loadingPatients ? (
            <div className="text-gray-500">Loading patients...</div>
          ) : (
            <select
              required
              value={formData.patientId}
              onChange={(e) => setFormData(prev => ({ ...prev, patientId: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Select a patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {getPatientDisplayName(patient)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            {categories.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.display}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Name *
          </label>
          <input
            type="text"
            required
            value={formData.reportName}
            onChange={(e) => setFormData(prev => ({ ...prev, reportName: e.target.value }))}
            placeholder="e.g., Complete Blood Count, Chest X-Ray"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Code (LOINC)
          </label>
          <input
            type="text"
            value={formData.reportCode}
            onChange={(e) => setFormData(prev => ({ ...prev, reportCode: e.target.value }))}
            placeholder="e.g., 24356-8"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status *
          </label>
          <select
            required
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="registered">Registered</option>
            <option value="partial">Partial</option>
            <option value="preliminary">Preliminary</option>
            <option value="final">Final</option>
            <option value="amended">Amended</option>
            <option value="corrected">Corrected</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Effective Date *
          </label>
          <input
            type="datetime-local"
            required
            value={formData.effectiveDate}
            onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Encounter (Optional)
          </label>
          <select
            value={formData.encounterId}
            onChange={(e) => setFormData(prev => ({ ...prev, encounterId: e.target.value }))}
            disabled={!formData.patientId}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100"
          >
            <option value="">Select an encounter</option>
            {encounters.map((encounter) => (
              <option key={encounter.id} value={encounter.id}>
                {encounter.class?.display || 'Encounter'} - {encounter.period?.start ? new Date(encounter.period.start).toLocaleDateString() : 'N/A'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Related Service Request (Optional)
          </label>
          <select
            value={formData.serviceRequestId}
            onChange={(e) => setFormData(prev => ({ ...prev, serviceRequestId: e.target.value }))}
            disabled={!formData.patientId}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100"
          >
            <option value="">Select a service request</option>
            {serviceRequests.map((request) => (
              <option key={request.id} value={request.id}>
                {request.code?.text || request.code?.coding?.[0]?.display || 'Service Request'} - {request.status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Conclusion
          </label>
          <textarea
            value={formData.conclusion}
            onChange={(e) => setFormData(prev => ({ ...prev, conclusion: e.target.value }))}
            placeholder="Enter report conclusion or summary"
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
            placeholder="Additional notes or comments"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Report'}
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

export default function NewDiagnosticReportPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <NewDiagnosticReportContent />
    </Suspense>
  )
}

