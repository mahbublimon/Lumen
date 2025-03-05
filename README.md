# Lumen: Assistive Robot for Blind Students

Lumen is a robotic companion designed to assist blind students by enhancing their independence through advanced features such as text-to-speech, gesture recognition, GPS navigation, and voice interaction.

## Features

1. **Text to Speech from Book**: Converts printed text into speech to assist with reading.
2. **Gesture Recognition**: Detects gestures and responds with sound-based feedback.
3. **GPS Navigation**: Assists users in moving from one place to another.
4. **Voice Recognition**: Responds to voice commands for interaction and control.
5. **Photo Capture**: Captures images to describe surroundings or assist with learning.

## Hardware Components Used

- **Raspberry Pi 3B**: Central processing unit.
- **DHT22**: Measures temperature and humidity for environmental monitoring.
- **MQ2 & MQ9**: Detects gas and air quality to ensure a safe environment.
- **APDS9960**: Enables gesture recognition and proximity sensing.
- **NEO M8N GPS Module**: Provides accurate location tracking for navigation.


## Installation and Usage

1. Clone the repository:

   ```bash
   git clone https://github.com/mahbublimon/lumen.git
   ```

2. Install the required dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Run the main script:

   ```bash
   python lumen.py
   ```

## Contributing

Contributions are welcome! If you'd like to contribute to Lumen, you can follow these steps:

1. Fork the repository on GitHub.
2. Create a new branch from the `main` branch for your changes.
3. Make your modifications and ensure they adhere to the project's coding style and guidelines.
4. Test your changes thoroughly.
5. Create a pull request (PR) against the `main` branch of the original repository.
6. Provide a clear description of your changes in the PR and link to any related issues.

### Coding Guidelines

- Follow PEP 8 guidelines for Python code.
- Use meaningful variable names and comments to enhance readability.
- Write clear commit messages explaining the purpose of each commit.

### Code of Conduct

Please note that Lumen has a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.

## License

This project is licensed under the [MIT License](LICENSE).
