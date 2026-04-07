# TAG-CENTER & App Marketing API — cURL examples

Set variables (adjust host and token):

```bash
export API_BASE="https://api.fifer.example/api/v1"
export TOKEN="<supabase_jwt_access_token>"
```

All new routes use the `Authorization` header. Existing FIFER landing routes (`/api/tiktok/*`, verification TXT) do **not** require this header.

---

## TAG-CENTER — list tags

```bash
curl -sS -H "Authorization: Bearer ${TOKEN}" \
  "${API_BASE}/tag-center/tags?type=pricing&limit=20"
```

## TAG-CENTER — create tag

```bash
curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  -d '{
    "name": "metric:price_midband",
    "type": "pricing",
    "description": "Mid band",
    "metrics": [{"key":"price","band":"mid"}],
    "virtues": [],
    "limitations": [],
    "cost_unit": "credit",
    "cost_value": 0.05,
    "created_by": "00000000-0000-4000-8000-000000000001"
  }' \
  "${API_BASE}/tag-center/tags"
```

## TAG-CENTER — get / patch / delete

```bash
TAG_ID="<uuid>"

curl -sS -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/tag-center/tags/${TAG_ID}"

curl -sS -X PATCH -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  -d '{"description":"updated"}' \
  "${API_BASE}/tag-center/tags/${TAG_ID}"

curl -sS -X DELETE -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/tag-center/tags/${TAG_ID}"
```

## Associations

```bash
curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  -d '{
    "tag_id": "'"${TAG_ID}"'",
    "entity_type": "product",
    "entity_id": "ae-demo-1001",
    "role": "pricing_signal",
    "weight": 1
  }' \
  "${API_BASE}/tag-center/associations"
```

## estimate_credits

```bash
curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  -d '{
    "lines": [
      {"engineId": "gemini_flash_text", "unit": "1k_tokens", "qty": 12},
      {"engineId": "elevenlabs_tts", "unit": "1k_chars", "qty": 2}
    ]
  }' \
  "${API_BASE}/tag-center/estimate-credits"
```

## rank_products

```bash
curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "id": "content-readiness-v1",
      "factors": [
        {"id": "engagement_proxy", "weight": 1, "path": "metrics.engagement_rate", "normalize": {"min": 0, "max": 1}}
      ]
    },
    "products": [
      {"product_id": "p1", "metrics": {"engagement_rate": 0.8}},
      {"product_id": "p2", "metrics": {"engagement_rate": 0.3}}
    ]
  }' \
  "${API_BASE}/tag-center/rank-products"
```

## audit_logs

```bash
curl -sS -H "Authorization: Bearer ${TOKEN}" \
  "${API_BASE}/tag-center/audit-logs?tag_id=${TAG_ID}&limit=50"
```

## App Marketing — create_campaign & simulate_campaign

```bash
curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  -d '{"name":"Spring push","objective":"ctr","channels":["tiktok"],"tag_ids":[]}' \
  "${API_BASE}/app-marketing/campaigns"

CID="<campaign_uuid>"

curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  -d '{"audience_size": 10000, "budget_credits": 500}' \
  "${API_BASE}/app-marketing/campaigns/${CID}/simulate"
```

---

## Legacy FIFER landing (regression / unchanged behavior)

These routes are **not** under `/api/v1` and must remain stable when TAG-CENTER is deployed elsewhere.

```bash
export LANDING="http://localhost:3000"
```

### TikTok OAuth start (no client key → 500 + plain text)

```bash
curl -sS -i "${LANDING}/api/tiktok/auth"
```

### TikTok site verification file

```bash
curl -sS "${LANDING}/tiktokILRHOJ6PtrpGd4bErLjYlXMNhrHRntEh.txt"
```

OpenAPI specification: [../openapi/fifer_tag_center_app_marketing_v1.yaml](../openapi/fifer_tag_center_app_marketing_v1.yaml)
