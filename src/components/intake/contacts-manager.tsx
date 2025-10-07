"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, User } from "lucide-react";
import { formatPhoneDisplay, formatPhoneE164 } from "@/lib/validations";

const CONTACT_TYPES = [
  { value: "clinician", label: "Clinician" },
  { value: "owner_physician", label: "Owner Physician" },
  { value: "admin", label: "Admin" },
  { value: "billing", label: "Billing" },
];

interface Contact {
  id: string;
  contactType: string;
  fullName: string;
  npiIndividual?: string | null;
  title?: string | null;
  email?: string | null;
  phoneDisplay?: string | null;
  phoneE164?: string | null;
  preferredContactMethod?: string | null;
}

export function ContactsManager({ 
  accountId, 
  contacts, 
  onContactsChange 
}: { 
  accountId: string; 
  contacts: Contact[];
  onContactsChange: (contacts: Contact[]) => void;
}) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    contactType: "clinician",
  });

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneDisplay(value);
    const e164 = formatPhoneE164(value);
    setNewContact(prev => ({
      ...prev,
      phoneDisplay: formatted,
      phoneE164: e164,
    }));
  };

  const handleAddContact = async () => {
    if (!newContact.fullName) {
      toast({
        title: "Validation Error",
        description: "Contact name is required",
        variant: "destructive",
      });
      return;
    }

    if (!newContact.email && !newContact.phoneE164) {
      toast({
        title: "Validation Error",
        description: "At least one contact method (email or phone) is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/accounts/${accountId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });

      if (response.ok) {
        const data = await response.json();
        onContactsChange([...contacts, data.contact]);
        setNewContact({ contactType: "clinician" });
        setShowForm(false);
        toast({
          title: "Success",
          description: "Contact added",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add contact",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) {
      return;
    }

    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onContactsChange(contacts.filter(c => c.id !== contactId));
        toast({
          title: "Success",
          description: "Contact deleted",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete contact",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>At least one contact required before sending</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Contact Form */}
        {showForm && (
          <div className="border border-border rounded-lg p-4 space-y-4 bg-accent/5">
            <h4 className="font-medium">New Contact</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={newContact.fullName || ""}
                  onChange={(e) => setNewContact({ ...newContact, fullName: e.target.value })}
                  placeholder="Dr. John Smith"
                />
              </div>

              <div>
                <Label htmlFor="contactType">Contact Type *</Label>
                <Select
                  value={newContact.contactType || "clinician"}
                  onValueChange={(value) => setNewContact({ ...newContact, contactType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newContact.title || ""}
                  onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                  placeholder="Practice Manager"
                />
              </div>

              <div>
                <Label htmlFor="npiIndividual">Individual NPI</Label>
                <Input
                  id="npiIndividual"
                  value={newContact.npiIndividual || ""}
                  onChange={(e) => setNewContact({ ...newContact, npiIndividual: e.target.value })}
                  placeholder="1234567890"
                  maxLength={10}
                />
              </div>

              <div>
                <Label htmlFor="contactEmail">Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={newContact.email || ""}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="john.smith@practice.com"
                />
              </div>

              <div>
                <Label htmlFor="contactPhone">Phone *</Label>
                <Input
                  id="contactPhone"
                  value={newContact.phoneDisplay || ""}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                <Select
                  value={newContact.preferredContactMethod || ""}
                  onValueChange={(value) => setNewContact({ ...newContact, preferredContactMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddContact}>Add Contact</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Contacts List */}
        {contacts.length === 0 && !showForm && (
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto text-[color:var(--muted)] mb-3" />
            <p className="text-[color:var(--muted)]">No contacts yet. Add at least one to enable sending.</p>
          </div>
        )}

        {contacts.map((contact) => (
          <div 
            key={contact.id}
            className="flex items-start justify-between border border-border rounded-lg p-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium">{contact.fullName}</h4>
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                  {CONTACT_TYPES.find(t => t.value === contact.contactType)?.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {contact.title && (
                  <div>
                    <span className="text-[color:var(--muted)]">Title:</span> {contact.title}
                  </div>
                )}
                {contact.npiIndividual && (
                  <div>
                    <span className="text-[color:var(--muted)]">NPI:</span> {contact.npiIndividual}
                  </div>
                )}
                {contact.email && (
                  <div>
                    <span className="text-[color:var(--muted)]">Email:</span> {contact.email}
                  </div>
                )}
                {contact.phoneDisplay && (
                  <div>
                    <span className="text-[color:var(--muted)]">Phone:</span> {contact.phoneDisplay}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteContact(contact.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
