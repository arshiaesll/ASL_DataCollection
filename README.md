# MultiModal Sign Language Learning App

A mobile application built with React Native (Expo) and Python backend for learning sign language through video analysis and real-time feedback.

## Project Structure

The project consists of two main parts:
- `muliModal/` - React Native (Expo) frontend application
- `server/` - Python backend server for video processing and motion analysis

## Features

- Video recording and playback
- Real-time motion analysis
- Sign language learning interface
- Audio visualization
- Acceleration data visualization

## Setup Instructions

### Frontend (React Native)

1. Navigate to the muliModal directory:
```bash
cd muliModal
```

2. Install dependencies:
```bash
npm install
```

3. Start the Expo development server:
```bash
npx expo start
```

### Backend (Python)

1. Navigate to the server directory:
```bash
cd server
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Start the server:
```bash
python server.py
```

## Tech Stack

### Frontend
- React Native (Expo)
- TypeScript
- Expo AV for video handling
- React Native components for visualization

### Backend
- Python
- FastAPI
- OpenCV for video processing
- Motion analysis algorithms

## Project Structure

```
├── muliModal/              # Frontend React Native application
│   ├── app/               # App screens and navigation
│   ├── components/        # Reusable React components
│   └── types/            # TypeScript type definitions
├── server/                # Backend Python server
│   ├── videos/           # Video storage
│   ├── motion_analyzer.py # Motion analysis logic
│   └── server.py         # FastAPI server
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
