const endpointGroups = [
  {
    title: "Authentication",
    endpoints: [
      ["POST", "/api/auth/login", "Login with email and password. Returns a Bearer token, user, organization, and roles."],
    ],
  },
  {
    title: "Dashboard",
    endpoints: [
      ["GET", "/api/dashboard?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&departmentId=1", "Dashboard counts and calendar events."],
    ],
  },
  {
    title: "Tasks",
    endpoints: [
      ["GET", "/api/tasks?page=1&pageSize=20", "List visible tasks."],
      ["GET", "/api/tasks/{id}", "Get task details."],
      ["POST", "/api/tasks/{id}/status", "Update task status with body { \"status\": \"todo|in_progress|completed|cancelled\" }."],
    ],
  },
  {
    title: "Shifts",
    endpoints: [
      ["GET", "/api/shifts?page=1&pageSize=20", "List visible shifts."],
      ["GET", "/api/shifts/{id}", "Get shift details with assigned employees."],
    ],
  },
  {
    title: "Leave",
    endpoints: [
      ["GET", "/api/leave?page=1&pageSize=20", "List visible leave requests."],
      ["POST", "/api/leave", "Create leave request with body { \"leaveType\", \"startDate\", \"endDate\", \"reason\", \"departmentId\" }."],
      ["POST", "/api/leave/{id}/approve", "Approve a leave request as a department manager or main admin."],
      ["POST", "/api/leave/{id}/reject", "Reject a leave request with body { \"reviewComment\" }."],
    ],
  },
  {
    title: "Notifications",
    endpoints: [
      ["GET", "/api/notifications?page=1&pageSize=20", "List current user's notifications."],
      ["POST", "/api/notifications/{id}/read", "Mark one notification as read."],
      ["POST", "/api/notifications/read-all", "Mark all current user's notifications as read."],
    ],
  },
];

export async function GET() {
  return new Response(renderDocs(), {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

function renderDocs() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WorkHub REST API</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; color: #172033; background: #f7f8fa; }
    main { max-width: 980px; margin: 0 auto; padding: 40px 20px; }
    h1 { margin: 0 0 8px; font-size: 32px; }
    h2 { margin-top: 32px; font-size: 22px; }
    p { color: #4b5870; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d8dee8; }
    th, td { padding: 12px; border-bottom: 1px solid #e6eaf0; text-align: left; vertical-align: top; }
    th { background: #edf1f6; font-size: 13px; text-transform: uppercase; color: #4b5870; }
    code { background: #edf1f6; padding: 2px 5px; border-radius: 4px; }
    .method { font-weight: 700; white-space: nowrap; }
  </style>
</head>
<body>
  <main>
    <h1>WorkHub REST API</h1>
    <p>Protected endpoints require <code>Authorization: Bearer &lt;token&gt;</code>. List endpoints support <code>page</code> and <code>pageSize</code>.</p>
    ${endpointGroups
      .map(
        (group) => `
          <h2>${group.title}</h2>
          <table>
            <thead><tr><th>Method</th><th>Endpoint</th><th>Description</th></tr></thead>
            <tbody>
              ${group.endpoints
                .map(
                  ([method, path, description]) => `
                    <tr>
                      <td class="method">${method}</td>
                      <td><code>${path}</code></td>
                      <td>${description}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        `,
      )
      .join("")}
  </main>
</body>
</html>`;
}
