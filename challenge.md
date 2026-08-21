# Liara Challenge: LLM Assistant for Product Documentation

## Problem

Liara's services and technical documentation are growing. Many support tickets and calls happen because users cannot find the relevant documentation or cannot understand it well enough to use a service.

## Goal

Build an LLM-based application that helps users find, understand, and act on Liara's documentation quickly and accurately, reducing avoidable support requests.

## Solution scope

- Use Liara's documentation as the application's knowledge source.
- A documentation-aware chatbot is acceptable, but it is only one possible solution; other LLM-based approaches are allowed.
- Relevant agentic and personalized capabilities are encouraged when they help users use or troubleshoot Liara services more easily.
- The product should handle both simple and complex questions, provide useful sources, retain conversational context, and guide users toward useful next steps.

## Documentation sources

- [Official Liara documentation](https://docs.liara.ir/)
- [Open-source Liara documentation repository](https://github.com/liara-cloud/docs)

## Deliverables

### Primary submission

- Public link to a complete, working deployment on Liara's infrastructure
- GitHub repository link
- Production-ready configuration that allows judges to use and test the application

Participant Liara accounts have been credited for deployment, and deployment on Liara is a scored requirement.

### Fallback when deployment is not possible

Submit a narrated demo video of at least 5 minutes that demonstrates all implemented capabilities across multiple scenarios. The other parts of the project can still be evaluated from the video, but the deployment score will not be awarded.

## Judging criteria — 300 points

### 1. Response quality and correctness — 80 points

- Correct and relevant responses
- Complete, practical answers
- Ability to retrieve the right information
- Reduction of incorrect or fabricated answers
- Appropriate source citations
- Good performance on simple and complex questions

### 2. UI design and user experience — 55 points

- High-quality, easy-to-use interface
- Good conversational experience
- Clear presentation of code, links, and technical information
- Smooth conversation continuation
- Responsive layouts
- Attention to UX details

### 3. Agentic capabilities and personalization — 50 points

- Correctly understand user intent
- Ask clarifying questions when needed
- Preserve conversation context
- Personalize responses
- Suggest useful next steps
- Perform multi-step processes
- Use agentic capabilities creatively and practically

### 4. Security, reliability, and monitoring — 50 points

- Rate limiting
- Secure API-key and secret management
- Error and failure handling
- Token-usage control and avoidance of unnecessary requests
- Logging and monitoring
- Maintainable, extensible architecture

### 5. Deployment on Liara — 40 points

- Successful execution on Liara's infrastructure
- Deployment-process quality
- Appropriate configuration
- Production readiness

### 6. Cost optimization — 25 points

- Appropriate model and service selection
- Token-usage control
- Reduction of unnecessary requests
- Caching where appropriate
- Infrastructure-cost awareness
- Good balance between response quality and cost

| Criterion | Points |
|---|---:|
| Response quality and correctness | 80 |
| UI design and user experience | 55 |
| Agentic capabilities and personalization | 50 |
| Security, reliability, and monitoring | 50 |
| Deployment on Liara | 40 |
| Cost optimization | 25 |
| **Total** | **300** |
