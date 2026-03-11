// Simplified Live2D logic for mouse tracking and utterance-driven mouth animation
var Live2DApp = Live2DApp || {};

// Main model class
function SimpleLive2DModel() {
    this.live2DModel = null; // The Live2D model instance (set externally)
    this.dragX = 0; // Mouse X position
    this.dragY = 0; // Mouse Y position
    this.isSpeaking = false; // Speech state
    this.mouthOpen = 0; // Mouth open value (0 to 0.7)
    this.lastMouthToggle = 0; // Last time mouth state changed
    this.mouthInterval = 150; // Mouth toggle interval (ms)
    this.speechDuration = 0; // Speech duration (ms)
    this.lastUpdateTime = Date.now(); // For animation timing
}

// Set the Live2D model instance
SimpleLive2DModel.prototype.setModel = function(model) {
    this.live2DModel = model;
};

// Update method: Handles mouse tracking and mouth animation
SimpleLive2DModel.prototype.update = function() {
    if (!this.live2DModel) {
        console.error("Live2D model not set.");
        return;
    }

    // Update the model state
    this.live2DModel.loadParam();

    // Mouse tracking for head and eye movement
    this.live2DModel.addToParamFloat("PARAM_ANGLE_X", this.dragX * 30, 1); // Head X rotation
    this.live2DModel.addToParamFloat("PARAM_ANGLE_Y", this.dragY * 30, 1); // Head Y rotation
    this.live2DModel.addToParamFloat("PARAM_EYE_BALL_X", this.dragX, 1); // Eye X movement
    this.live2DModel.addToParamFloat("PARAM_EYE_BALL_Y", this.dragY, 1); // Eye Y movement

    // Speech-driven mouth animation
    var currentTime = Date.now();
    if (this.isSpeaking) {
        // Toggle mouth open/close every mouthInterval ms
        if (currentTime - this.lastMouthToggle >= this.mouthInterval) {
            this.mouthOpen = this.mouthOpen === 0 ? (Math.random() * 0.4 + 0.3) : 0; // Random open value (0.3-0.7)
            this.lastMouthToggle = currentTime;
            console.log("Mouth set to: " + this.mouthOpen);
        }
        // End speech when duration is exceeded
        if (currentTime - this.lastMouthToggle >= this.speechDuration) {
            this.isSpeaking = false;
            this.mouthOpen = 0;
            this.speechDuration = 0;
            console.log("Speech ended, mouth reset.");
        }
        this.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", this.mouthOpen, 1);
    } else {
        this.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", 0, 1); // Reset mouth
    }

    // Finalize model update
    this.live2DModel.saveParam();
    this.live2DModel.update();
};

// Start speech and animate mouth
SimpleLive2DModel.prototype.startSpeech = function(text) {
    if (!window.speechSynthesis) {
        console.error("Speech synthesis not supported.");
        return;
    }

    try {
        var utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Estimate speech duration
        var words = text.split(/\s+/).length;
        var wordsPerMinute = 150; // Average speaking rate
        this.speechDuration = (words / wordsPerMinute) * 60 * 1000; // Duration in ms
        this.mouthInterval = Math.max(100, Math.min(200, this.speechDuration / (words * 2)));

        var self = this;
        utterance.onstart = function() {
            self.isSpeaking = true;
            self.lastMouthToggle = Date.now();
            console.log("Speech started.");
        };
        utterance.onend = function() {
            self.isSpeaking = false;
            self.mouthOpen = 0;
            self.speechDuration = 0;
            self.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", 0, 1);
            console.log("Speech ended.");
        };
        utterance.onerror = function(event) {
            self.isSpeaking = false;
            self.mouthOpen = 0;
            self.speechDuration = 0;
            self.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", 0, 1);
            console.error("Speech error: " + event.error);
        };

        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error("Speech synthesis error: " + error);
        this.isSpeaking = false;
        this.mouthOpen = 0;
        this.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", 0, 1);
    }
};

// Set mouse drag position
SimpleLive2DModel.prototype.setDrag = function(x, y) {
    this.dragX = x;
    this.dragY = y;
};

// Expose the class globally
Live2DApp.SimpleLive2DModel = SimpleLive2DModel;
window.Live2DApp = Live2DApp;