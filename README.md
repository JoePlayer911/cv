# Personal Portfolio & Web Projects

ENGLISH | [简体中文](README_CN.md)

Welcome to my personal portfolio repository! This project serves as a showcase of my web development skills, featuring a sleek, modern landing page alongside a collection of interactive web applications, games, and AI integrations.

## Features

- **Modern UI/UX:** A responsive, glassmorphism-inspired landing page (`index.html`) with smooth scroll animations powered by Intersection Observer.
- **Vanilla Tech Stack:** Built primarily with HTML5, CSS3 Custom Properties, and Vanilla JavaScript—no heavy frontend frameworks required.
- **Centralized Architecture:** A shared infrastructure (`shared.js`, `projects.css`) that standardizes API calls, utility functions, and navigation across all sub-projects.
- **AI Integrations:** Features projects utilizing Gemini LLMs and ElevenLabs TTS (Text-to-Speech) APIs.
- **Python Backend:** A lightweight Flask server (`app.py`) handles static file serving and local progress saving.

## Included Projects

This repository contains multiple standalone web applications, accessible from the main portfolio page:
1. **Mandarin Vocabulary Quiz:** A flashcard-style language learning tool integrated with Google Sheets.
2. **LLM Fill-in-the-Blank:** Adaptive AI-generated language quizzes.
3. **Xingqiu's Novel Adventure:** An interactive 2D canvas game.
4. **Protect Mondstadt:** A 3D-style canvas shooter game.
5. **Word Safari:** An emoji-matching English vocabulary game.
6. **Live2D + AI Voice Demo:** A fully interactive Live2D avatar hooked up to an LLM and the ElevenLabs Voice API (`gemini.html`).

## Getting Started

### Prerequisites
- Python 3.x
- A modern web browser
- *(Optional)* An ElevenLabs API key if you wish to run the TTS features in `gemini.html`.

### Running Locally

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/JoePlayer911/cv.git
   cd cv
   ```

2. Start the local Flask server:
   ```bash
   python app.py
   ```

3. Open your browser and navigate to:
   ```
   http://127.0.0.1:5000/
   ```

## License

This project is intended as a personal portfolio. The underlying Live2D models belong to their respective creators and are subject to the [Live2D Free Material License Agreement](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html).
