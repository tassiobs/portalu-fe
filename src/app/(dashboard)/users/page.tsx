'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { apiFetch, ApiError } from '@/lib/api'
import { PageGuard } from '@/components/PageGuard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OrgUser {
  id: string
  name: string
  email: string
  status: string
  org_roles: { id: string; name: string }[]
}

interface PaginatedUsers {
  data: OrgUser[]
  total: number
  page: number
  per_page: number
}

interface Invitation {
  id: string
  name: string
  email: string
  invited_at: string
  status: string
}

export default function UsersPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  const {
    data: usersData,
    isLoading: usersLoading,
    mutate: mutateUsers,
  } = useSWR<PaginatedUsers>(
    `/org/users?page=${page}&per_page=20`,
    () => apiFetch<PaginatedUsers>(`/org/users?page=${page}&per_page=20`),
  )

  const {
    data: invitations,
    isLoading: invitationsLoading,
    mutate: mutateInvitations,
  } = useSWR<Invitation[]>('/org/invitations', () => apiFetch<Invitation[]>('/org/invitations'))

  async function deactivateUser(id: string) {
    if (!confirm('Deactivate this user?')) return
    try {
      await apiFetch(`/org/users/${id}/deactivate`, { method: 'POST' })
      await mutateUsers()
      toast.success('User deactivated')
    } catch {
      toast.error('Failed to deactivate user')
    }
  }

  async function sendInvite() {
    if (!inviteName.trim() || !inviteEmail.trim()) return
    setInviting(true)
    try {
      await apiFetch('/org/users', {
        method: 'POST',
        body: JSON.stringify({ name: inviteName, email: inviteEmail }),
      })
      await mutateUsers()
      await mutateInvitations()
      setInviteOpen(false)
      setInviteName('')
      setInviteEmail('')
      toast.success('Invitation sent')
    } catch (err) {
      const msg = (err as ApiError).body ? ((err as ApiError).body as { message?: string })?.message ?? 'Failed to send invite' : 'Failed to send invite'
      toast.error(msg)
    } finally {
      setInviting(false)
    }
  }

  async function resendInvitation(id: string) {
    try {
      await apiFetch(`/org/invitations/${id}/resend`, { method: 'POST' })
      toast.success('Invitation resent')
    } catch {
      toast.error('Failed to resend invitation')
    }
  }

  async function cancelInvitation(id: string) {
    if (!confirm('Cancel this invitation?')) return
    try {
      await apiFetch(`/org/invitations/${id}`, { method: 'DELETE' })
      await mutateInvitations()
      toast.success('Invitation cancelled')
    } catch {
      toast.error('Failed to cancel invitation')
    }
  }

  const totalPages = usersData ? Math.ceil(usersData.total / usersData.per_page) : 1

  return (
    <PageGuard allowed={can(user, 'org.users.manage')}>
      <div className="max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <Button onClick={() => setInviteOpen(!inviteOpen)}>Invite user</Button>
        </div>

        {/* Invite form */}
        {inviteOpen && (
          <Card>
            <CardHeader>
              <CardTitle>Invite a new user</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="space-y-1 flex-1">
                  <Label>Full name</Label>
                  <Input
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>
                <Button onClick={sendInvite} disabled={inviting}>
                  {inviting ? 'Sending…' : 'Send invite'}
                </Button>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200">
          {(['members', 'invitations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'members' && (
          <Card>
            <CardContent className="p-0">
              {usersLoading ? (
                <LoadingSpinner />
              ) : !usersData?.data?.length ? (
                <p className="text-sm text-gray-500 text-center py-8">No members found.</p>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium text-gray-600">Name</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-600">Email</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-600">Status</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-600">Roles</th>
                        <th className="px-6 py-3 text-right font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {usersData.data.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <a href={`/users/${u.id}`} className="text-blue-600 hover:underline font-medium">
                              {u.name}
                            </a>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{u.email}</td>
                          <td className="px-6 py-4">
                            <Badge
                              variant={u.status === 'active' ? 'default' : 'secondary'}
                              className={u.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                            >
                              {u.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {u.org_roles?.map((r) => (
                                <Badge key={r.id} variant="outline" className="text-xs">
                                  {r.name}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {u.status !== 'inactive' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => deactivateUser(u.id)}
                              >
                                Deactivate
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                      <span className="text-sm text-gray-500">
                        Page {page} of {totalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 1}
                          onClick={() => setPage(page - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() => setPage(page + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'invitations' && (
          <Card>
            <CardContent className="p-0">
              {invitationsLoading ? (
                <LoadingSpinner />
              ) : !invitations?.length ? (
                <p className="text-sm text-gray-500 text-center py-8">No invitations found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-600">Name</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-600">Email</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-600">Invited at</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-600">Status</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{inv.name}</td>
                        <td className="px-6 py-4 text-gray-600">{inv.email}</td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(inv.invited_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline">{inv.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resendInvitation(inv.id)}
                            >
                              Resend
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => cancelInvitation(inv.id)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageGuard>
  )
}
