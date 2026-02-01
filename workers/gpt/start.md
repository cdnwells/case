1. Start worker: `uvicorn main:app --reload`
2. Test health: `curl http://localhost:8000/health`
3. Test chat:
   ```bash
   curl -X POST http://localhost:8000/chat \
     -H "Content-Type: application/json" \
     -H "X-API-Key: test-key" \
     -d '{"content": "How do I list files?"}'
