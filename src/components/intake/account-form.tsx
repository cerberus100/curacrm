"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save, Send, Plus, Trash2, AlertCircle, AlertTriangle } from "lucide-react";
import { formatPhoneDisplay, formatPhoneE164, formatEinTinDisplay, formatEinTinStorage } from "@/lib/validations";
import { ContactsManager } from "./contacts-manager";
import { ConfirmSendDialog } from "./confirm-send-dialog";
import { US_STATES, SPECIALTIES } from "@/lib/constants";

interface Account {
  id: string;
  practiceName: string;
  specialty: string;
  state: string;
  npiOrg?: string | null;
  einTin?: string | null;
  phoneDisplay?: string | null;
  phoneE164?: string | null;
  email?: string | null;
  website?: string | null;
  ehrSystem?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  zip?: string | null;
  leadSource?: string | null;
  status: string;
  ownerRepId: string;
  contacts: any[];
}

// Mock current user - in production, get from auth
const CURRENT_USER_ID = "00000000-0000-0000-0000-000000000001";

export function AccountForm({ accountId, onClose }: { accountId: string | null; onClose: () => void }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [account, setAccount] = useState<Partial<Account>>({
    practiceName: "",
    state: "",
    ownerRepId: CURRENT_USER_ID,
    status: "PENDING",
  });
  const [primaryContact, setPrimaryContact] = useState({
    name: "",
    position: "",
  });
  const [contacts, setContacts] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load existing account
  useEffect(() => {
    if (accountId) {
      const fetchAccount = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/accounts/${accountId}`);
          if (response.ok) {
            const data = await response.json();
            setAccount(data.account);
            setContacts(data.account.contacts || []);
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to load account",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchAccount();
    }
  }, [accountId]);

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneDisplay(value);
    const e164 = formatPhoneE164(value);
    setAccount(prev => ({
      ...prev,
      phoneDisplay: formatted,
      phoneE164: e164,
    }));
  };

  const handleEinTinChange = (value: string) => {
    const storage = formatEinTinStorage(value);
    setAccount(prev => ({
      ...prev,
      einTin: storage,
    }));
  };

  const checkDuplicates = async (npi?: string, phone?: string) => {
    if (!npi && !phone) {
      setDuplicateWarning(null);
      setDuplicateMatches([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (npi) params.append("npi", npi);
      if (phone) params.append("phone", phone);

      const response = await fetch(`/api/accounts/check-duplicates?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.count > 0) {
          setDuplicateWarning(data.message);
          setDuplicateMatches(data.matches);
          toast({
            title: "⚠️ Potential Duplicates Found",
            description: `Found ${data.count} similar practice(s). Review before sending.`,
            variant: "destructive",
          });
        } else {
          setDuplicateWarning(null);
          setDuplicateMatches([]);
        }
      }
    } catch (error) {
      console.error("Duplicate check failed:", error);
    }
  };

  const handleNPIBlur = () => {
    if (account.npiOrg && account.npiOrg.length === 10) {
      checkDuplicates(account.npiOrg, undefined);
    }
  };

  const handlePhoneBlur = () => {
    if (account.phoneE164) {
      checkDuplicates(undefined, account.phoneE164);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!account.practiceName || account.practiceName.length < 3) {
      newErrors.practiceName = "Practice name must be at least 3 characters";
    }
    if (!primaryContact.name || primaryContact.name.length < 2) {
      newErrors.contactName = "Contact name is required";
    }
    if (!primaryContact.position || primaryContact.position.length < 2) {
      newErrors.contactPosition = "Position/title is required";
    }
    if (!account.specialty) {
      newErrors.specialty = "Specialty is required";
    }
    if (!account.state) {
      newErrors.state = "State is required";
    }
    if (account.npiOrg && !/^[0-9]{10}$/.test(account.npiOrg)) {
      newErrors.npiOrg = "NPI must be exactly 10 digits";
    }
    if (account.einTin && !/^\d{9}$/.test(account.einTin)) {
      newErrors.einTin = "EIN/TIN must be exactly 9 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const url = accountId ? `/api/accounts/${accountId}` : "/api/accounts";
      const method = accountId ? "PATCH" : "POST";

      // Prepare account data with primary contact
      const accountData = {
        ...account,
        primaryContactName: primaryContact.name,
        primaryContactPosition: primaryContact.position,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountData),
      });

      if (response.ok) {
        const data = await response.json();
        setAccount(data.account);
        toast({
          title: "Success",
          description: accountId ? "Account updated" : "Account created",
        });
        if (!accountId) {
          // If creating new, switch to edit mode
          setAccount(data.account);
        }
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save account",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save account",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = () => {
    if (!account.id) {
      toast({
        title: "Save Required",
        description: "Please save the account before sending to CuraGenesis",
        variant: "destructive",
      });
      return;
    }

    if (contacts.length === 0) {
      toast({
        title: "Contact Required",
        description: "Please add at least one contact before sending",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before sending",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation modal
    setShowConfirm(true);
  };

  const handleConfirmedSend = async () => {
    setShowConfirm(false);
    setIsSending(true);
    try {
      const response = await fetch("/api/submissions/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "✅ Success",
          description: data.message || "Account sent to CuraGenesis",
        });
        onClose();
      } else {
        toast({
          title: "Submission Failed",
          description: data.error || "Failed to send account",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send submission",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-[color:var(--muted)]">
          Loading account...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {accountId ? "Edit Account" : "New Account"}
            </h1>
            <p className="text-[color:var(--muted)] mt-1">
              {accountId ? `Status: ${account.status}` : "Fill in practice details"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button 
            onClick={handleSend}
            disabled={isSending || !account.id}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending..." : "Send to CuraGenesis"}
          </Button>
        </div>
      </div>

      {/* Practice Details */}
      <Card>
        <CardHeader>
          <CardTitle>Practice Information</CardTitle>
          <CardDescription>Required fields are marked with *</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="practiceName">Practice Name *</Label>
              <Input
                id="practiceName"
                value={account.practiceName || ""}
                onChange={(e) => setAccount({ ...account, practiceName: e.target.value })}
                placeholder="ABC Medical Center"
              />
              {errors.practiceName && (
                <p className="text-sm text-destructive mt-1">{errors.practiceName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contactName">Primary Contact Name *</Label>
              <Input
                id="contactName"
                value={primaryContact.name}
                onChange={(e) => setPrimaryContact({ ...primaryContact, name: e.target.value })}
                placeholder="Dr. John Smith"
              />
              {errors.contactName && (
                <p className="text-sm text-destructive mt-1">{errors.contactName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contactPosition">Position/Title *</Label>
              <Input
                id="contactPosition"
                value={primaryContact.position}
                onChange={(e) => setPrimaryContact({ ...primaryContact, position: e.target.value })}
                placeholder="Practice Manager, Medical Director, etc."
              />
              {errors.contactPosition && (
                <p className="text-sm text-destructive mt-1">{errors.contactPosition}</p>
              )}
            </div>

            <div>
              <Label htmlFor="specialty">Specialty *</Label>
              <Select
                value={account.specialty || ""}
                onValueChange={(value) => setAccount({ ...account, specialty: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((spec) => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.specialty && (
                <p className="text-sm text-destructive mt-1">{errors.specialty}</p>
              )}
            </div>

            <div>
              <Label htmlFor="state">State *</Label>
              <Select
                value={account.state || ""}
                onValueChange={(value) => setAccount({ ...account, state: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-sm text-destructive mt-1">{errors.state}</p>
              )}
            </div>

            <div>
              <Label htmlFor="npiOrg">Organization NPI (10 digits)</Label>
              <Input
                id="npiOrg"
                value={account.npiOrg || ""}
                onChange={(e) => setAccount({ ...account, npiOrg: e.target.value })}
                onBlur={handleNPIBlur}
                placeholder="1234567890"
                maxLength={10}
              />
              {errors.npiOrg && (
                <p className="text-sm text-destructive mt-1">{errors.npiOrg}</p>
              )}
            </div>

            <div>
              <Label htmlFor="einTin">EIN/TIN (9 digits)</Label>
              <Input
                id="einTin"
                value={account.einTin ? formatEinTinDisplay(account.einTin) : ""}
                onChange={(e) => handleEinTinChange(e.target.value)}
                placeholder="12-3456789"
                maxLength={11}
              />
              {errors.einTin && (
                <p className="text-sm text-destructive mt-1">{errors.einTin}</p>
              )}
              <p className="text-xs text-[color:var(--muted)] mt-1">
                Federal Tax ID (XX-XXXXXXX)
              </p>
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={account.phoneDisplay || ""}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={handlePhoneBlur}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={account.email || ""}
                onChange={(e) => setAccount({ ...account, email: e.target.value })}
                placeholder="contact@practice.com"
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={account.website || ""}
                onChange={(e) => setAccount({ ...account, website: e.target.value })}
                placeholder="https://practice.com"
              />
            </div>

            <div>
              <Label htmlFor="leadSource">Lead Source</Label>
              <Input
                id="leadSource"
                value={account.leadSource || ""}
                onChange={(e) => setAccount({ ...account, leadSource: e.target.value })}
                placeholder="Referral, Conference, etc."
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input
                id="addressLine1"
                value={account.addressLine1 || ""}
                onChange={(e) => setAccount({ ...account, addressLine1: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={account.addressLine2 || ""}
                onChange={(e) => setAccount({ ...account, addressLine2: e.target.value })}
                placeholder="Suite 100"
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={account.city || ""}
                onChange={(e) => setAccount({ ...account, city: e.target.value })}
                placeholder="San Francisco"
              />
            </div>

            <div>
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={account.zip || ""}
                onChange={(e) => setAccount({ ...account, zip: e.target.value })}
                placeholder="94102"
                maxLength={10}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Warning */}
      {duplicateWarning && duplicateMatches.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>⚠️ Potential Duplicates Detected</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{duplicateWarning}</p>
            <div className="space-y-2 mt-3">
              {duplicateMatches.map((match) => (
                <div key={match.id} className="text-xs border border-yellow-500/30 rounded p-2 bg-yellow-500/5">
                  <p className="font-semibold">{match.practiceName}</p>
                  <p className="text-[color:var(--muted)]">
                    {match.city}, {match.state} • {match.npiOrg} • {match.phoneDisplay}
                  </p>
                  <p className="text-[color:var(--muted)]">
                    Rep: {match.ownerRep?.name || "Unassigned"} • Status: {match.status}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs mt-2 text-yellow-300">
              Review these matches before sending to avoid duplicates in CuraGenesis.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Contacts */}
      {account.id && (
        <ContactsManager 
          accountId={account.id} 
          contacts={contacts}
          onContactsChange={setContacts}
        />
      )}

      {!account.id && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-[color:var(--muted)] mx-auto mb-2" />
            <p className="text-[color:var(--muted)]">
              Save the account first to add contacts
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Modal */}
      <ConfirmSendDialog
        open={showConfirm}
        onConfirm={handleConfirmedSend}
        onCancel={() => setShowConfirm(false)}
        account={account}
        contacts={contacts}
      />
    </div>
  );
}
