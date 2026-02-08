'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { diagnosticReportService, DiagnosticReport } from '@/lib/services/diagnosticreport-service'
import { patientService, Patient } from '@/lib/services/patient-service'
import { encounterService, Encounter } from '@/lib/services/encounter-service'
import { serviceRequestService, ServiceRequest } from '@/lib/services/servicerequest-service'

export default function DiagnosticReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string

  const [report, setReport] = useState<DiagnosticReport | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [encounter, setEncounter] = useState<Encounter | null>(null)
  const [serviceRequest, setServiceRequest] = useState<ServiceRequest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (reportId) {
      loadReport()
    }
  }, [reportId])

  const loadReport = async () => {
    try {
      const data = await diagnosticReportService.getById(reportId)
      setReport(data)

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
      console.error('Error loading diagnostic report:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800'
    switch (status.toLowerCase()) {
      case 'final':
        return 'bg-green-100 text-green-800'
      case 'preliminary':
        return 'bg-yellow-100 text-yellow-800'
      case 'partial':
        return 'bg-blue-100 text-blue-800'
      case 'amended':
        return 'bg-purple-100 text-purple-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading diagnostic report...</div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Diagnostic report not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {report.code?.text || report.code?.coding?.[0]?.display || 'Diagnostic Report'}
          </h1>
          <p className="text-gray-600 mt-2">Report ID: {report.id}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/diagnosticreports"
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            ← Back to Reports
          </Link>
        </div>
      </div>

      {/* Status Badge */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
            {report.status || 'Unknown'}
          </span>
          {report.category && report.category.length > 0 && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-600">
                {report.category[0].coding?.[0]?.display || report.category[0].text || 'Report'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Report Information</h2>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Report Name:</span>
                <p className="text-gray-900 mt-1">
                  {report.code?.text || report.code?.coding?.[0]?.display || 'N/A'}
                </p>
              </div>
              {report.code?.coding?.[0]?.code && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Code:</span>
                  <p className="text-gray-900 mt-1">{report.code.coding[0].code}</p>
                </div>
              )}
              {report.effectiveDateTime && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Effective Date:</span>
                  <p className="text-gray-900 mt-1">{formatDateTime(report.effectiveDateTime)}</p>
                </div>
              )}
              {report.issued && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Issued:</span>
                  <p className="text-gray-900 mt-1">{formatDateTime(report.issued)}</p>
                </div>
              )}
              {report.performer && report.performer.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Performer:</span>
                  <p className="text-gray-900 mt-1">
                    {report.performer[0].display || report.performer[0].reference || 'N/A'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Conclusion */}
          {report.conclusion && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Conclusion</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{report.conclusion}</p>
            </div>
          )}

          {/* Notes */}
          {report.note && report.note.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Notes</h2>
              <div className="space-y-3">
                {report.note.map((note, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <p className="text-gray-700">{note.text}</p>
                    {note.authorString && (
                      <p className="text-sm text-gray-500 mt-1">— {note.authorString}</p>
                    )}
                    {note.time && (
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(note.time)}</p>
                    )}
                  </div>
                ))}
              </div>
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
                <p className="font-medium text-gray-900">
                  {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}
                </p>
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
                  {encounter.period?.start ? formatDateTime(encounter.period.start) : 'N/A'}
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

          {/* Report Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Details</h2>
            <div className="space-y-3 text-sm">
              {report.id && (
                <div>
                  <span className="font-medium text-gray-700">ID:</span>
                  <p className="text-gray-600 mt-1 font-mono text-xs">{report.id}</p>
                </div>
              )}
              {report.resourceType && (
                <div>
                  <span className="font-medium text-gray-700">Resource Type:</span>
                  <p className="text-gray-600 mt-1">{report.resourceType}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

