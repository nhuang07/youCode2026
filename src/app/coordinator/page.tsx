"use client";

import { useState } from "react";
import Link from "next/link";

type Tab = "overview" | "urgent" | "volunteers" | "handoffs";

export default function CoordinatorDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showUrgentForm, setShowUrgentForm] = useState(false);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Dashboard" },
    { id: "urgent", label: "Crisis Requests" },
    { id: "volunteers", label: "My Volunteers" },
    { id: "handoffs", label: "Knowledge Base" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Top bar */}
      <nav
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        <div
          className="text-xl font-bold tracking-tight"
          style={{ color: "var(--accent-green)" }}
        >
          rooted
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveTab("urgent");
              setShowUrgentForm(true);
            }}
            className="btn btn-urgent text-sm"
          >
            🚨 Post Urgent Request
          </button>
          <Link href="/" className="btn btn-ghost text-sm">
            Sign Out
          </Link>
        </div>
      </nav>

      {/* Tabs */}
      <div
        className="flex gap-1 px-6 pt-4 pb-0"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-3 text-sm font-medium transition-colors"
            style={{
              color:
                activeTab === tab.id
                  ? "var(--accent-green)"
                  : "var(--text-muted)",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--accent-green)"
                  : "2px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {activeTab === "overview" && (
          <div className="stagger-children">
            <h2 className="text-2xl font-bold mb-6">Organization Health</h2>

            {/* Health stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="card p-5 text-center">
                <div
                  className="text-3xl font-bold"
                  style={{ color: "var(--urgency-critical)" }}
                >
                  11
                </div>
                <div
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Volunteers needed
                </div>
              </div>
              <div className="card p-5 text-center">
                <div
                  className="text-3xl font-bold"
                  style={{ color: "var(--accent-green)" }}
                >
                  18
                </div>
                <div
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Active volunteers
                </div>
              </div>
              <div className="card p-5 text-center">
                <div
                  className="text-3xl font-bold"
                  style={{ color: "var(--status-cooling)" }}
                >
                  3
                </div>
                <div
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Cooling off
                </div>
              </div>
              <div className="card p-5 text-center">
                <div
                  className="text-3xl font-bold"
                  style={{ color: "var(--status-at-risk)" }}
                >
                  2
                </div>
                <div
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  At risk
                </div>
              </div>
            </div>

            {/* Volunteers needing check-in */}
            <div className="card p-6 mb-6">
              <h3 className="text-lg font-bold mb-4">
                Suggested Check-ins
              </h3>
              <div className="space-y-3">
                <div
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "var(--accent-orange-light)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="status-dot status-at-risk" />
                    <div>
                      <div className="text-sm font-semibold">
                        Sarah Torres
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Last active 18 days ago — declining hours trend
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-outline text-xs py-1.5 px-3">
                    Send Check-in
                  </button>
                </div>

                <div
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "var(--accent-yellow-light)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="status-dot status-cooling" />
                    <div>
                      <div className="text-sm font-semibold">
                        James Haddad
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Last active 10 days ago — missed last 2 shifts
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-outline text-xs py-1.5 px-3">
                    Send Check-in
                  </button>
                </div>

                <div
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "var(--accent-yellow-light)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="status-dot status-cooling" />
                    <div>
                      <div className="text-sm font-semibold">
                        Kofi Williams
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Last active 12 days ago — reduced availability
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-outline text-xs py-1.5 px-3">
                    Send Check-in
                  </button>
                </div>
              </div>
            </div>

            {/* Knowledge coverage */}
            <div className="card p-6">
              <h3 className="text-lg font-bold mb-4">
                Knowledge Coverage
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Meal Delivery Coordinator</span>
                  <span className="tag tag-skill">Handoff complete</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Saturday Kitchen Lead</span>
                  <span
                    className="tag"
                    style={{
                      background: "var(--accent-orange-light)",
                      color: "var(--accent-orange)",
                    }}
                  >
                    No handoff yet
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Event Setup Volunteer</span>
                  <span className="tag tag-skill">Handoff complete</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "urgent" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Crisis Requests</h2>
              <button
                onClick={() => setShowUrgentForm(!showUrgentForm)}
                className="btn btn-urgent text-sm"
              >
                + New Request
              </button>
            </div>

            {showUrgentForm && (
              <div className="card p-6 mb-6 animate-fade-in">
                <h3 className="text-lg font-bold mb-4">
                  Post an Urgent Request
                </h3>
                <form className="space-y-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      What do you need?
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-lg text-sm"
                      style={{
                        border: "1.5px solid var(--border-light)",
                        background: "var(--bg-primary)",
                      }}
                      placeholder="e.g. 2 delivery drivers for meal distribution"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Description
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg text-sm"
                      style={{
                        border: "1.5px solid var(--border-light)",
                        background: "var(--bg-primary)",
                      }}
                      placeholder="Tell volunteers what they'll be doing and why it matters..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-sm font-medium mb-1.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        When
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full px-4 py-2.5 rounded-lg text-sm"
                        style={{
                          border: "1.5px solid var(--border-light)",
                          background: "var(--bg-primary)",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm font-medium mb-1.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        How many people
                      </label>
                      <input
                        type="number"
                        min={1}
                        defaultValue={1}
                        className="w-full px-4 py-2.5 rounded-lg text-sm"
                        style={{
                          border: "1.5px solid var(--border-light)",
                          background: "var(--bg-primary)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="btn btn-primary">
                      Post & Notify Volunteers
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUrgentForm(false)}
                      className="btn btn-outline"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <p style={{ color: "var(--text-muted)" }}>
              Your active and past crisis requests will appear here.
            </p>
          </div>
        )}

        {activeTab === "volunteers" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">My Volunteers</h2>
            <p style={{ color: "var(--text-muted)" }}>
              Volunteer engagement data and status will appear here.
            </p>
          </div>
        )}

        {activeTab === "handoffs" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Knowledge Base</h2>
            <p style={{ color: "var(--text-muted)" }}>
              Role handoff documents from past and current volunteers will
              appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
