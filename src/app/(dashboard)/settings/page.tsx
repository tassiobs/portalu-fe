'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { apiFetch, ApiError } from '@/lib/api'
import { PageGuard } from '@/components/PageGuard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Org {
  id: string
  name: string
}

interface OrgSettings {
  lockout: {
    enabled: boolean
    max_attempts: number
    lockout_duration_minutes: number
  }
  mfa: {
    enabled: boolean
    require: boolean
  }
}

export default function SettingsPage() {
  const { user } = useAuth()

  const { data: org, isLoading: orgLoading, mutate: mutateOrg } = useSWR<Org>(
    '/org',
    () => apiFetch<Org>('/org'),
  )

  const { data: settings, isLoading: settingsLoading, mutate: mutateSettings } =
    useSWR<OrgSettings>('/org/settings', () => apiFetch<OrgSettings>('/org/settings'))

  // Org name state
  const [orgName, setOrgName] = useState('')
  const [savingOrg, setSavingOrg] = useState(false)
  const [editingOrgName, setEditingOrgName] = useState(false)

  useEffect(() => {
    if (org) setOrgName(org.name)
  }, [org])

  // Security settings state
  const [lockoutEnabled, setLockoutEnabled] = useState(false)
  const [maxAttempts, setMaxAttempts] = useState(5)
  const [lockoutDuration, setLockoutDuration] = useState(30)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaRequire, setMfaRequire] = useState(false)
  const [savingSecurity, setSavingSecurity] = useState(false)

  useEffect(() => {
    if (settings) {
      setLockoutEnabled(settings.lockout?.enabled ?? false)
      setMaxAttempts(settings.lockout?.max_attempts ?? 5)
      setLockoutDuration(settings.lockout?.lockout_duration_minutes ?? 30)
      setMfaEnabled(settings.mfa?.enabled ?? false)
      setMfaRequire(settings.mfa?.require ?? false)
    }
  }, [settings])

  async function saveOrgName() {
    setSavingOrg(true)
    try {
      await apiFetch('/org', { method: 'PATCH', body: JSON.stringify({ name: orgName }) })
      await mutateOrg()
      setEditingOrgName(false)
      toast.success('Organization name updated')
    } catch (err) {
      const msg = (err as ApiError).body ? ((err as ApiError).body as { message?: string })?.message ?? 'Failed to save' : 'Failed to save'
      toast.error(msg)
    } finally {
      setSavingOrg(false)
    }
  }

  async function saveSecuritySettings() {
    setSavingSecurity(true)
    try {
      await apiFetch('/org/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          lockout: {
            enabled: lockoutEnabled,
            max_attempts: maxAttempts,
            lockout_duration_minutes: lockoutDuration,
          },
          mfa: {
            enabled: mfaEnabled,
            require: mfaRequire,
          },
        }),
      })
      await mutateSettings()
      toast.success('Security settings saved')
    } catch (err) {
      const msg = (err as ApiError).body ? ((err as ApiError).body as { message?: string })?.message ?? 'Failed to save' : 'Failed to save'
      toast.error(msg)
    } finally {
      setSavingSecurity(false)
    }
  }

  return (
    <PageGuard allowed={can(user, 'org.users.manage')}>
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>

        {/* Organization card */}
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent>
            {orgLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Organization name</Label>
                  {editingOrgName ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="max-w-xs"
                        autoFocus
                      />
                      <Button size="sm" onClick={saveOrgName} disabled={savingOrg}>
                        {savingOrg ? 'Saving…' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingOrgName(false)
                          setOrgName(org?.name ?? '')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">{org?.name}</span>
                      <button
                        onClick={() => setEditingOrgName(true)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security settings card */}
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-6">
                {/* Account Lockout */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Account Lockout</p>
                      <p className="text-sm text-gray-500">
                        Lock accounts after failed login attempts
                      </p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={lockoutEnabled}
                      onClick={() => setLockoutEnabled(!lockoutEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        lockoutEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          lockoutEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {lockoutEnabled && (
                    <div className="pl-4 border-l-2 border-gray-100 space-y-3">
                      <div className="space-y-1">
                        <Label>Max failed attempts</Label>
                        <Input
                          type="number"
                          min={1}
                          value={maxAttempts}
                          onChange={(e) => setMaxAttempts(Number(e.target.value))}
                          className="w-32"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Lockout duration (minutes)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={lockoutDuration}
                          onChange={(e) => setLockoutDuration(Number(e.target.value))}
                          className="w-32"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100" />

                {/* MFA */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Multi-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Enable MFA for your organization</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={mfaEnabled}
                      onClick={() => {
                        setMfaEnabled(!mfaEnabled)
                        if (mfaEnabled) setMfaRequire(false)
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        mfaEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          mfaEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {mfaEnabled && (
                    <div className="pl-4 border-l-2 border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Require MFA</p>
                          <p className="text-xs text-gray-500">Force all users to set up MFA</p>
                        </div>
                        <button
                          role="switch"
                          aria-checked={mfaRequire}
                          onClick={() => setMfaRequire(!mfaRequire)}
                          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                            mfaRequire ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              mfaRequire ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={saveSecuritySettings} disabled={savingSecurity}>
                  {savingSecurity ? 'Saving…' : 'Save security settings'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  )
}
