# Eye Tracking Application

This project is an eye tracking application built using OpenCV. It captures video from the camera and processes the frames to detect and track eyes in real-time.

## Project Structure

```
eye-tracking-app
├── src
│   ├── main.py          # Entry point of the application
│   ├── eye_tracker.py   # Contains the EyeTracker class for eye detection and tracking
│   └── utils.py        # Utility functions for image processing
├── requirements.txt     # Lists the project dependencies
└── README.md            # Documentation for the project
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd eye-tracking-app
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

## Usage Guidelines

To run the application, execute the following command:

```
python src/main.py
```

Ensure that your camera is connected and accessible. The application will open a window displaying the video feed with detected eyes highlighted.

## Overview of Functionality

- **Eye Detection**: The application uses Haar cascades for detecting eyes in the video frames.
- **Real-time Tracking**: Once eyes are detected, their positions are tracked in subsequent frames.
- **Image Processing Utilities**: Various utility functions assist in processing the video frames for better detection accuracy.

## Dependencies

This project requires the following Python packages:

- OpenCV
- Any other necessary libraries listed in `requirements.txt`