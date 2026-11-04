# Permissions & Security

API keys grant programmatic access to your ChatboxAI account. To protect your credits and data, ChatboxAI allows you to create heavily scoped keys with granular permissions.

---

## 1. Key Environments

When creating a new API key, you must assign it to an environment:

- **Live (`cbx_live_`)**: These keys hit production endpoints. They deduct USD credits from your balance (on the Paid tier) or consume your 300 daily requests (on the Free tier).
- **Test (`cbx_test_`)**: These keys are designed for local development and CI/CD pipelines. They do not deduct USD credits but are severely rate-limited (5 RPM) and may automatically route expensive model requests to smaller, free-tier equivalents.

---

## 2. Scoping Permissions

By default, a new API key has `Full Access`. We strongly recommend restricting keys to only the endpoints they need.

| Scope | Allowed Endpoints | Use Case |
|-------|-------------------|----------|
| `chat.write` | `/chat/completions`, `/responses` | Standard chatbots and text agents. |
| `images.write` | `/images/generations` | Image generation services. |
| `models.read` | `/models` | Dashboard UIs that need to list available models. |
| `billing.read` | `/billing/usage` | Internal scripts monitoring token spend. |

If a key attempts to access an endpoint outside its scope, it will return a `403 Forbidden` error.

---

## 3. Best Practices

1. **Never expose keys in frontend code:** Do not embed `cbx_live_` keys in React, Vue, or mobile apps. Always route requests through your own backend server.
2. **Rotate keys regularly:** If you suspect a key has been compromised (e.g., accidentally committed to a public GitHub repo), delete it immediately from the ChatboxAI dashboard and generate a new one.
3. **Use separate keys per environment:** Create different keys for your Staging server and your Production server. This allows you to track usage separately and revoke staging access without impacting production.

---

## 4. IP Allowlisting

For enterprise security, you can restrict an API key to only accept requests originating from specific IP addresses (e.g., the static IP of your AWS NAT Gateway).

To configure this, click the gear icon next to your API key in the Dashboard and enter a comma-separated list of IPv4 or IPv6 addresses. Any request coming from outside these IPs will be rejected with a `403 Forbidden`.
