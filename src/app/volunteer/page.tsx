"use client";

import { useState } from "react";
import Link from "next/link";

type Tab = "opportunities" | "urgent" | "impact" | "handoffs";

export default function VolunteerDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("urgent");

  const tabs: { id: Tab; label: string; alert?: boolean }[] = [
    { id: "urgent", label: "Crisis Alerts", alert: true },
    { id: "opportunities", label: "Browse Opportunities" },
    { id: "impact", label: "My Impact" },
    { id: "handoffs", label: "Handoffs" },
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
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Welcome back
          </span>
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
            className="relative px-4 py-3 text-sm font-medium transition-colors"
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
            {tab.alert && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                style={{ background: "var(--urgency-critical)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {activeTab === "urgent" && (
          <div className="stagger-children">
            <h2 className="text-2xl font-bold mb-6">
              <span style={{ color: "var(--urgency-critical)" }}>●</span>{" "}
              Active Crisis Requests
            </h2>

            {/* Sample urgent request card */}
            <div
              className="card p-6 mb-4"
              style={{
                borderLeft: "4px solid var(--urgency-critical)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="urgency-badge urgency-critical mb-2">
                    Critical
                  </span>
                  <h3 className="text-lg font-bold mt-2">
                    Emergency Meal Delivery Drivers Needed
                  </h3>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Harvest of Hope Society — Vancouver
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "var(--urgency-critical)" }}
                  >
                    Tomorrow 9 AM
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    3 of 5 spots filled
                  </div>
                </div>
              </div>

              <p
                className="text-sm mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                Two delivery drivers called in sick. We need volunteers with
                vehicles to deliver meals to 200 families across East Vancouver.
                Route takes approximately 3 hours.
              </p>

              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="tag tag-skill">
                  Driving/transportation
                </span>
                <span className="tag tag-skill">Cooking/food prep</span>
                <span className="tag tag-language">English</span>
                <span className="tag tag-language">Cantonese</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="score-bar w-24">
                    <div
                      className="score-bar-fill"
                      style={{
                        width: "85%",
                        background: "var(--accent-green)",
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "var(--accent-green)" }}
                  >
                    85% match
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-outline text-sm">
                    Decline
                  </button>
                  <button className="btn btn-urgent text-sm">
                    I Can Help
                  </button>
                </div>
              </div>
            </div>

            {/* Another sample */}
            <div
              className="card p-6 mb-4"
              style={{
                borderLeft: "4px solid var(--urgency-high)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="urgency-badge urgency-high mb-2">
                    High
                  </span>
                  <h3 className="text-lg font-bold mt-2">
                    Mandarin Interpreter for Newcomer Intake
                  </h3>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Immigrant Services Society of BC — Vancouver
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "var(--urgency-high)" }}
                  >
                    This Friday 2 PM
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    0 of 2 spots filled
                  </div>
                </div>
              </div>

              <p
                className="text-sm mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                Our regular Mandarin interpreter is unavailable. We have 8
                newcomer families scheduled for intake appointments and need
                someone who can interpret between Mandarin and English.
              </p>

              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="tag tag-skill">
                  Translation/interpretation
                </span>
                <span className="tag tag-language">English</span>
                <span className="tag tag-language">Mandarin</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="score-bar w-24">
                    <div
                      className="score-bar-fill"
                      style={{
                        width: "72%",
                        background: "var(--accent-green)",
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "var(--accent-green)" }}
                  >
                    72% match
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-outline text-sm">
                    Decline
                  </button>
                  <button className="btn btn-urgent text-sm">
                    I Can Help
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "opportunities" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">
              Opportunities For You
            </h2>
            <p style={{ color: "var(--text-muted)" }}>
              Matched opportunities will appear here based on your profile.
            </p>
          </div>
        )}

        {activeTab === "impact" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Your Impact</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="card p-5 text-center">
                <div
                  className="text-3xl font-bold"
                  style={{ color: "var(--accent-green)" }}
                >
                  24
                </div>
                <div
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Hours volunteered
                </div>
              </div>
              <div className="card p-5 text-center">
                <div
                  className="text-3xl font-bold"
                  style={{ color: "var(--accent-green)" }}
                >
                  8
                </div>
                <div
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Shifts completed
                </div>
              </div>
              <div className="card p-5 text-center">
                <div
                  className="text-3xl font-bold"
                  style={{ color: "var(--urgency-critical)" }}
                >
                  3
                </div>
                <div
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Crisis responses
                </div>
              </div>
              <div className="card p-5 text-center">
                <div
                  className="text-3xl font-bold"
                  style={{ color: "var(--accent-yellow)" }}
                >
                  5
                </div>
                <div
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Week streak
                </div>
              </div>
            </div>
            <p
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Impact details from completed shifts will appear here.
            </p>
          </div>
        )}

        {activeTab === "handoffs" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Role Handoffs</h2>
            <p style={{ color: "var(--text-muted)" }}>
              Knowledge handoff documents for your roles will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
