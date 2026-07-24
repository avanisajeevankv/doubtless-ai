# Project Concept Note: Doubtless AI

## 1. Project Title & Application Name
* **Project Name**: Doubtless AI
* **Sub-title**: Centered Multimodal Bilingual Doubt-Solver

## 2. Problem Statement / Objective
Students transitioning from regional-language schooling to English-medium higher education often struggle with dense academic English terms and textbook explanations. They find it hard to bridge the gap between their native language understanding and the English terminology required on campus exams.

**Doubtless AI** addresses this problem by acting as a centered bilingual academic oracle. By simply asking a question or uploading a photo/diagram of a academic query, students receive side-by-side explanations: one column in college-level English, and the other in their native language (e.g., Hindi, Tamil, Kannada). This helps students map complex technical ideas to their mother tongue, improving concept retention and academic confidence.

## 3. Target User & Use Case
* **Target Audience**: Regional and international students who require dual-language assistance to adapt to English-medium university courses.
* **Core Use Case**: A student faces a difficult concept or image of a formula. They paste or upload it to the centered console of Doubtless AI, pick their native language, and select their academic level (Beginner, Standard, or Advanced). The system generates a side-by-side translation, a glossary of key bilingual terms, and an interactive 3D check-in quiz to verify understanding.

## 4. LLM Model and API Used
* **Model**: `gemini-1.5-flash` (with Multimodal Image Input support).
* **API**: Google Gemini API via the `@google/generative-ai` SDK.
* **Reasoning**: `gemini-1.5-flash` natively accepts image payloads alongside instructions, providing low latency responses and multi-language translation in a single structured JSON response.

## 5. Key Features of the Application
1. **Centered Perplexity-style Console**: A clean, centered workspace with drag-and-drop or select file attachments.
2. **Multimodal Image Solver**: Gemini-powered equation and diagram decryption directly from image base64 uploads.
3. **Floating Space Background**: Animating gradient orbs drifting in the background.
4. **Visual Voice Waveform**: A dynamic bar waveform that bounces while voice recognition is active.
5. **Side-by-Side Bilingual Explanations & Glossaries**: Dual translation displays matching native locale speech synthesis read-aloud buttons.
6. **3D Quiz Flip Cards**: CSS 3D flip-cards presenting multiple-choice questions that rotate on-click to reveal answers and explanations.
