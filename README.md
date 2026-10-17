# 🔥 Agni Kavach — Tadoba FireOps
### Software-Based Forest Fire Detection, Verification & Response System

**Hackathon:** WildHack 2026  
**Challenge:** Challenge C — Forest Fire Detection and Response  
**Project Type:** Software Prototype

---

## 🌲 1. Overview

**Agni Kavach (Tadoba FireOps)** is a software-based forest fire monitoring and response platform designed to support early detection, verification, localization, and communication of potential forest fires in the Tadoba-Andhari Tiger Reserve region of Maharashtra, India.

The system combines satellite-based fire observations, geographical boundaries, simulated sensor signals, and incident verification workflows to help users distinguish potential fire incidents from false alarms and prioritize appropriate responses.

Instead of relying on a single signal, the platform aims to provide useful context for each potential incident, including its location, confidence level, verification status, and recommended next steps.

> **Our goal:** Turn a potential fire signal into verified, location-aware, actionable information for faster forest fire response.

## 🎯 2. Problem Statement

Forest fires can threaten wildlife, forest ecosystems, nearby communities, and natural resources. Detecting a potential fire is only the first step; responders also need to understand where it is occurring, whether the signal is credible, and what action should follow.

Key challenges include:

- Detecting potential fire signals from different data sources.
- Identifying the geographical location of a possible incident.
- Reducing false alarms through contextual verification.
- Communicating useful information to the appropriate response team.
- Handling limitations caused by connectivity, power availability, environmental conditions, and field deployment.

Agni Kavach addresses these challenges through a unified software workflow.

## 💡 3. Proposed Solution

The platform is designed around five key capabilities:

1. **Fire Signal Detection** — Ingest potential fire observations from NASA FIRMS satellite data and simulated sensor events.
2. **Geographical Localization** — Map incident coordinates against the Tadoba region and display relevant geographical context.
3. **False Alarm Verification** — Compare available observations, signal characteristics, and nearby reports to support incident assessment.
4. **Incident Prioritization** — Classify incidents by status and severity to help users identify which events require attention.
5. **Actionable Communication** — Present incident details and recommended actions through a centralized dashboard and response workflow.

All verification results are decision-support outputs. A software-generated classification does not, by itself, confirm an actual forest fire.

## 🛰️ 4. Data Sources

The prototype is designed to use the following data sources:

| Data source | Purpose |
|---|---|
| NASA FIRMS | Satellite-based active fire and thermal anomaly observations |
| NASA VIIRS / MODIS | Satellite instruments supplying relevant hotspot observations through supported FIRMS products |
| Google Earth / geographical boundary data | Visual geographical context and regional boundary reference |
| CSV datasets | Historical records, test cases, and analysis |
| Wokwi ESP32 simulation | Simulated sensor readings and potential fire alerts for software integration testing |
| Synthetic test data | Controlled scenarios for testing detection, verification, and response workflows |

**Important:** Simulated and synthetic data are used for development and testing, not as proof of real-world fire activity. Live data availability depends on the source, update frequency, access configuration, and network connectivity.

## ⚙️ 5. System Workflow

The proposed end-to-end workflow is:

1. **Signal received:** A satellite hotspot observation or simulated sensor event enters the system.
2. **Data validation:** Required fields, coordinates, timestamps, and signal values are checked.
3. **Location mapping:** The event is plotted on a map and checked against the target geographical region.
4. **Contextual verification:** Available satellite observations, sensor readings, time, and nearby events are compared.
5. **Incident classification:** The event is marked as potential, under verification, confirmed, false alarm, or unresolved, as appropriate.
6. **Response recommendation:** The system generates a useful incident summary and suggests the next action.
7. **Incident tracking:** Users review, update, and record verification outcomes and response progress.

## 🗺️ 6. Key Features

- Interactive fire-monitoring dashboard.
- Satellite hotspot visualization.
- Geographical incident localization.
- Simulated multi-sensor event integration.
- Incident severity and verification status tracking.
- False alarm and unresolved incident management.
- Incident history and verification records.
- Recommended response actions.
- Support for future notification and field-team communication integrations.
- Data-source and connectivity status indicators, where supported.

Features are developed incrementally as part of the hackathon prototype.

## 🧰 7. Technology Stack

| Technology | Role |
|---|---|
| React | Frontend dashboard and user interface |
| JavaScript | Application logic and data handling |
| Node.js | Backend runtime |
| Express.js | REST API and backend services |
| MongoDB Atlas | Cloud database for incidents and event records |
| NASA FIRMS API | Satellite fire observation data |
| Google Earth / geographical data | Regional visualization and boundary context |
| Wokwi | ESP32 sensor simulation and event testing |
| CSV | Dataset import and analysis |
| Git and GitHub | Version control and team collaboration |

The stack reflects the planned architecture; individual components may still be under development or integration.

## 🏗️ 8. High-Level Architecture

```text
NASA FIRMS ─────────┐
                    │
Wokwi Simulation ───┼──> Data Ingestion
                    │         │
CSV / Test Data ────┘         ▼
                       Validation & Processing
                                │
                                ▼
                       Contextual Verification
                                │
                                ▼
                       Incident Classification
                                │
                     ┌──────────┴──────────┐
                     ▼                     ▼
               MongoDB Atlas        Response Workflow
                     │                     │
                     └──────────┬──────────┘
                                ▼
                        React Dashboard
                                │
                                ▼
                   Human Review & Action
```

This is the proposed logical architecture. Actual integrations depend on the current implementation.

## 🛡️ 9. False Alarm Reduction

Satellite thermal anomalies and simulated sensor readings are treated as **potential signals**, not automatic proof of a forest fire.

The system can support verification by considering:

- Whether coordinates fall inside the target region.
- Whether multiple observations occur near the same location.
- Whether observations are close in time.
- Whether different available data sources support the same incident.
- Whether sensor readings are plausible and persistent.
- Whether a previous report or verification record already exists.

The system should retain uncertain cases for human review instead of automatically declaring every signal a confirmed fire.

**Note:** FIRMS provides satellite-derived active fire and thermal anomaly observations. It does not guarantee that every observation represents a forest fire, and a lack of observations does not prove that a fire is absent.

## 🚨 10. Actionable Response

Each incident should provide, where available:

- Incident ID and detection timestamp.
- Latitude and longitude.
- Data source and observation details.
- Verification status and confidence rationale.
- Severity or priority level.
- Nearby geographical context.
- Recommended next step.
- Assigned responder or team, if configured.
- Verification notes and response history.

Potential actions include requesting field verification, reviewing nearby observations, notifying an authorized response team, and updating the incident status.

The prototype supports decision-making; real emergency dispatch and official notifications require appropriate authorization and operational integration.

## 🌍 11. Environmental and Deployment Limitations

| Limitation | Consideration |
|---|---|
| Satellite coverage | Observations may be delayed or missed due to overpass timing, cloud conditions, sensor resolution, or detection thresholds. |
| False positives | Thermal anomalies may originate from sources other than forest fires. |
| Connectivity | Network outages may interrupt live data ingestion, dashboard updates, and notifications. |
| Power availability | Field devices cannot be assumed to operate continuously without sufficient power. |
| Sensor reliability | Simulated readings do not establish the reliability of physical sensors deployed in forests. |
| GPS accuracy | Coordinate errors may affect localization and boundary checks. |
| Data availability | API access, rate limits, outages, and update intervals can affect monitoring. |
| Field deployment | Real deployment requires validation, suitable equipment, secure communications, and coordination with forest authorities. |

The system should indicate stale or unavailable data rather than presenting outdated observations as live information.

## 🔐 12. Security and Reliability

Future production hardening should include:

- Secure API credentials stored in environment variables.
- Input validation and API error handling.
- Authentication and role-based authorization.
- Duplicate-event handling and timestamp validation.
- Logging of incident verification and status changes.
- Network-failure handling and retry mechanisms.
- Protection of sensitive location and operational information.

API keys and database credentials must never be committed to the public repository.

## 🚀 13. Future Scope

- Integration with additional verified real-time data sources.
- Automated contextual anomaly scoring.
- Offline-friendly dashboard and queued event processing.
- Email, SMS, or other authorized notification integrations.
- Incident clustering and hotspot trend analysis.
- Historical fire analysis and risk visualization.
- Responder assignment and incident acknowledgement.
- Testing with real field observations and feedback from domain experts.
- Deployment monitoring and operational reliability metrics.

## 👥 14. Team Development

Agni Kavach is being developed collaboratively for WildHack 2026. The project can be divided into frontend development, backend and database integration, satellite and geographical data integration, simulation and testing, and verification and response workflow design.

Each module should be integrated through agreed API contracts and a common incident data structure.

## 🧪 15. Prototype Status

The project is being developed incrementally, with simulated data and available datasets supporting early testing before full live-data integration.

Planned milestones:

- [ ] Establish repository and project structure.
- [ ] Implement the incident data model and backend APIs.
- [ ] Integrate NASA FIRMS observations.
- [ ] Visualize incidents on a geographical map.
- [ ] Connect the Wokwi simulation to the software workflow.
- [ ] Implement verification and false alarm handling.
- [ ] Add incident status tracking and response recommendations.
- [ ] Test API failures, stale data, duplicate events, and connectivity loss.
- [ ] Prepare an end-to-end hackathon demonstration.

Update these checkboxes as each milestone is completed.

## ▶️ 16. Getting Started

Clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_FOLDER>
```

Install dependencies in the relevant application directories:

```bash
npm install
```

Create a `.env` file in the backend directory using the environment variables required by your implementation. For example:

```env
PORT=5000
MONGODB_URI=<YOUR_MONGODB_CONNECTION_STRING>
NASA_FIRMS_API_KEY=<YOUR_FIRMS_API_KEY>
```

Use the actual variable names expected by your backend. Never commit the `.env` file or real credentials.

Start the backend using the script configured in `package.json`, for example:

```bash
npm run dev
```

Follow the frontend's own setup instructions to start the dashboard. The application requires valid service configuration for live integrations; simulated or sample data can be used for local development.

## 📄 17. Data and Responsible Use

This project is a hackathon prototype intended for research, demonstration, and decision support. It is not a replacement for official fire detection systems, trained field personnel, or emergency response authorities.

All generated test data must be identified as synthetic or simulated. Incident classifications should communicate uncertainty, and any operational deployment should be validated with reliable data, domain experts, and relevant authorities.

## 🏁 18. Conclusion

**Agni Kavach — Tadoba FireOps** aims to bridge the gap between detecting a potential forest fire and enabling a useful response. By combining satellite observations, simulated sensor events, geographical context, verification workflows, and incident communication, the platform provides a foundation for a more organized and transparent forest fire response process.

**Detect. Verify. Locate. Respond.**

---

*Built for WildHack 2026 — Challenge C: Forest Fire Detection and Response.*
