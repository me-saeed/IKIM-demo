'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { medicationRequestService, MedicationRequest } from '@/lib/services/medicationrequest-service'

function MedicationRequestsContent() {
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId')
  
  const [medicationRequests, setMedicationRequests] = useState<MedicationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterIntent, setFilterIntent] = useState<string>('')

  useEffect(() => {
    loadMedicationRequests()
  }, [patientId, filterStatus, filterIntent])

  const loadMedicationRequests = async () => {
    try {
      const filters: any = { _count: 50 }
      if (patientId) {
        filters.patient = `Patient/${patientId}`
      }
      if (filterStatus) {
        filters.status = filterStatus
      }
      if (filterIntent) {
        filters.intent = filterIntent
      }
      const data = await medicationRequestService.search(filters)
      setMedicationRequests(data)
    } catch (error) {
      console.error('Error loading medication requests:', error)
    } finally {
      setLoading(false)
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
    return new Date(dateString).toLocaleDateString()
  }

  const getMedicationName = (request: MedicationRequest) => {
    if (request.medicationReference?.display) {
      return request.medicationReference.display
    }
    if (request.medicationCodeableConcept?.text) {
      return request.medicationCodeableConcept.text
    }
    if (request.medicationCodeableConcept?.coding?.[0]?.display) {
      return request.medicationCodeableConcept.coding[0].display
    }
    return 'Medication'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading prescriptions...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prescriptions</h1>
          <p className="text-gray-600 mt-2">Manage medication prescriptions and orders</p>
        </div>
        <Link
          href={`/medicationrequests/new${patientId ? `?patientId=${patientId}` : ''}`}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <span>➕</span> Create Prescription
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="on-hold">On Hold</option>
              <option value="stopped">Stopped</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intent
            </label>
            <select
              value={filterIntent}
              onChange={(e) => setFilterIntent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Intents</option>
              <option value="order">Order</option>
              <option value="plan">Plan</option>
              <option value="proposal">Proposal</option>
            </select>
          </div>
          {patientId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Filter
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600">
                Filtered by Patient
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Medication Requests List */}
      {medicationRequests.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-200">
            {medicationRequests.map((request) => {
              const medicationName = getMedicationName(request)
              const patientIdFromRef = request.subject?.reference?.split('/')[1]
              
              return (
                <Link
                  key={request.id}
                  href={`/medicationrequests/${request.id}`}
                  className="block p-6 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">💊</span>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {medicationName}
                        </h3>
                      </div>
                      <div className="ml-11 space-y-1">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status || 'Unknown'}
                          </span>
                          {request.priority && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(request.priority)}`}>
                              {request.priority.toUpperCase()}
                            </span>
                          )}
                          {request.intent && (
                            <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-800">
                              {request.intent}
                            </span>
                          )}
                        </div>
                        {request.dosageInstruction && request.dosageInstruction.length > 0 && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Dosage:</span> {request.dosageInstruction[0].text || 'See details'}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {patientIdFromRef && (
                            <span>
                              Patient: <Link href={`/patients/${patientIdFromRef}`} className="text-blue-600 hover:text-blue-700" onClick={(e) => e.stopPropagation()}>
                                {request.subject?.display || patientIdFromRef}
                              </Link>
                            </span>
                          )}
                          {request.authoredOn && (
                            <span>Prescribed: {formatDate(request.authoredOn)}</span>
                          )}
                          {request.requester?.display && (
                            <span>By: {request.requester.display}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-blue-600 text-xl ml-4">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <span className="text-6xl block mb-4">💊</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No prescriptions found</h3>
          <p className="text-gray-500 mb-6">
            {patientId ? 'This patient has no prescriptions yet.' : 'Get started by creating a new prescription.'}
          </p>
          <Link
            href={`/medicationrequests/new${patientId ? `?patientId=${patientId}` : ''}`}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Create Prescription
          </Link>
        </div>
      )}
    </div>
  )
}

export default function MedicationRequestsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <MedicationRequestsContent />
    </Suspense>
  )
}

