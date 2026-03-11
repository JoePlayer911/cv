var a = a || {};

(function () {
    "use strict";

    // L2DBaseModel class (simplified base structure)
    a.L2DBaseModel = function () {
        this.live2DModel = null;
        this.modelHomeDir = "";
        this.modelSetting = null;
        this.tmpMatrix = [];
    };

    // Custom class c extending L2DBaseModel with utterance and mouse logic
    function c() {
        a.L2DBaseModel.prototype.constructor.call(this);
        this.modelHomeDir = "";
        this.modelSetting = null;
        this.tmpMatrix = [];
        // Speech synthesis state variables
        this.isSpeaking = false;
        this.mouthOpen = 0; // Current mouth open value (0 to ~0.7)
        this.lastMouthToggle = 0; // Timestamp of last mouth state change
        this.mouthInterval = 150; // Default interval for mouth animation (ms)
        this.speechDuration = 0; // Estimated duration of current speech in ms
        this.dragX = 0; // Mouse X drag
        this.dragY = 0; // Mouse Y drag
        this.startTimeMSec = UtSystem.getUserTimeMSec();
        this.mainMotionManager = new a.MotionManager();
        this.expressionManager = null;
        this.eyeBlink = null;
        this.physics = null;
        this.pose = null;
        this.hasSleepyMotion = false;
    }

    c.prototype = new a.L2DBaseModel();

    // Update method with mouse and utterance logic
    c.prototype.update = function () {
        if (this.live2DModel != null) {
            var timeSec = (UtSystem.getUserTimeMSec() - this.startTimeMSec) / 1000 * 2 * Math.PI;

            // Motion and blink updates
            if (this.mainMotionManager.isFinished() && "1" === sessionStorage.getItem("Sleepy") && this.hasSleepyMotion) {
                this.hasSleepyMotion = this.startRandomMotion(u().MOTION_GROUP_SLEEPY, u().PRIORITY_SLEEPY);
            } else if (this.mainMotionManager.isFinished()) {
                this.startRandomMotion(u().MOTION_GROUP_IDLE, u().PRIORITY_IDLE);
            }

            this.live2DModel.loadParam();
            this.mainMotionManager.updateParam(this.live2DModel);
            if (this.eyeBlink) this.eyeBlink.updateParam(this.live2DModel);
            this.live2DModel.saveParam();
            if (this.expressionManager && !this.expressionManager.isFinished()) this.expressionManager.updateParam(this.live2DModel);
            if (this.physics) this.physics.updateParam(this.live2DModel);
            if (this.pose) this.pose.updateParam(this.live2DModel);

            // Mouse-based parameter updates
            this.live2DModel.addToParamFloat("PARAM_ANGLE_X", 30 * this.dragX, 1);
            this.live2DModel.addToParamFloat("PARAM_ANGLE_Y", 30 * this.dragY, 1);
            this.live2DModel.addToParamFloat("PARAM_ANGLE_Z", this.dragX * this.dragY * -30, 1);
            this.live2DModel.addToParamFloat("PARAM_BODY_ANGLE_X", 10 * this.dragX, 1);
            this.live2DModel.addToParamFloat("PARAM_EYE_BALL_X", this.dragX, 1);
            this.live2DModel.addToParamFloat("PARAM_EYE_BALL_Y", this.dragY, 1);

            // Breathing animation
            this.live2DModel.addToParamFloat("PARAM_ANGLE_X", Number(15 * Math.sin(timeSec / 6.5345)), 0.5);
            this.live2DModel.addToParamFloat("PARAM_ANGLE_Y", Number(8 * Math.sin(timeSec / 3.5345)), 0.5);
            this.live2DModel.addToParamFloat("PARAM_ANGLE_Z", Number(10 * Math.sin(timeSec / 5.5345)), 0.5);
            this.live2DModel.addToParamFloat("PARAM_BODY_ANGLE_X", Number(4 * Math.sin(timeSec / 15.5345)), 0.5);
            this.live2DModel.setParamFloat("PARAM_BREATH", Number(0.5 + 0.5 * Math.sin(timeSec / 3.2345)), 1);

            // Utterance-driven mouth movement
            if (this.isSpeaking) {
                var currentTime = UtSystem.getUserTimeMSec();
                if (currentTime - this.lastMouthToggle >= this.mouthInterval) {
                    this.mouthOpen = this.mouthOpen === 0 ? (Math.random() * 0.4 + 0.3) : 0; // Open (~0.3-0.7) or close
                    this.lastMouthToggle = currentTime;
                    u().DEBUG_LOG && console.log("[Live2Dv2] Set PARAM_MOUTH_OPEN_Y to: " + this.mouthOpen + " at: " + currentTime);
                    this.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", this.mouthOpen, 1);
                }
                if (this.speechDuration > 0 && currentTime - this.lastMouthToggle >= this.speechDuration) {
                    this.isSpeaking = false;
                    this.mouthOpen = 0;
                    this.speechDuration = 0;
                    this.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", 0, 1);
                    u().DEBUG_LOG && console.log("[Live2Dv2] Speech ended, resetting mouth at: " + currentTime);
                }
            } else {
                this.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", 0, 1); // Reset mouth when not speaking
            }

            this.live2DModel.update();
        } else {
            u().DEBUG_LOG && console.error("Failed to update.");
        }
    };

    // Method to start speech and animate mouth
    c.prototype.startSpeech = function (text) {
        if (!window.speechSynthesis) {
            u().DEBUG_LOG && console.error("[Live2Dv2] Speech synthesis not supported");
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
            var wordsPerMinute = 150;
            this.speechDuration = (words / wordsPerMinute) * 60 * 1000; // Duration in ms
            this.mouthInterval = Math.max(100, Math.min(200, this.speechDuration / (words * 2)));

            var self = this;
            utterance.onstart = function () {
                self.isSpeaking = true;
                self.lastMouthToggle = UtSystem.getUserTimeMSec();
                u().DEBUG_LOG && console.log("[Live2Dv2] Speech started at: " + Date.now());
            };

            utterance.onend = function () {
                self.isSpeaking = false;
                self.mouthOpen = 0;
                self.speechDuration = 0;
                self.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", 0, 1);
                u().DEBUG_LOG && console.log("[Live2Dv2] Speech ended at: " + Date.now());
            };

            utterance.onerror = function (event) {
                self.isSpeaking = false;
                self.mouthOpen = 0;
                self.speechDuration = 0;
                self.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", 0, 1);
                u().DEBUG_LOG && console.error("[Live2Dv2] Speech synthesis error: " + event.error);
            };

            window.speechSynthesis.speak(utterance);
        } catch (error) {
            u().DEBUG_LOG && console.error("[Live2Dv2] Speech synthesis error: " + error);
            this.isSpeaking = false;
            this.mouthOpen = 0;
            this.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", 0, 1);
        }
    };

    // Mouse event handlers (same as original)
    c.prototype.setDrag = function (x, y) {
        this.dragX = x;
        this.dragY = y;
    };

    c.prototype.getModelMatrix = function () {
        return this.live2DModel.getModelMatrix();
    };

    c.prototype.setExpression = function (expressionID) {
        if (this.expressionManager) this.expressionManager.startMotion(expressionID, 0);
    };

    c.prototype.startRandomMotion = function (name, priority) {
        var motion = this.modelSetting.getMotion(name);
        if (motion == null || motion.length == 0) return false;
        var motionIndex = Math.floor(Math.random() * motion.length);
        return this.startMotion(name, motionIndex, priority);
    };

    c.prototype.startMotion = function (name, index, priority) {
        var motion = this.modelSetting.getMotion(name);
        if (motion == null || motion.length <= index) return false;
        if (priority == u().PRIORITY_FORCE) this.mainMotionManager.setReservePriority(priority);
        else if (!this.mainMotionManager.reserveMotion(priority)) return false;
        var thisRef = this;
        var motionInstance = new a.Motion(motion[index]);
        motionInstance.setFinishedMotionHandler(function (e) {
            thisRef.mainMotionManager.setReservePriority(0);
            if (thisRef.live2DModel) thisRef.live2DModel.motionManager = null;
            thisRef.startRandomMotion(u().MOTION_GROUP_IDLE, u().PRIORITY_IDLE);
        });
        return this.mainMotionManager.startMotionPrio(motionInstance, priority);
    };

    // Expose the class
    a.Live2DModelWebGL = c;

    // Utility function (assumed from original context)
    var u = function () {
        return {
            DEBUG_LOG: true,
            MOTION_GROUP_IDLE: "idle",
            MOTION_GROUP_SLEEPY: "sleepy",
            PRIORITY_IDLE: 1,
            PRIORITY_SLEEPY: 2,
            PRIORITY_FORCE: 3
        };
    };

    // UtSystem (simplified for demo purposes)
    var UtSystem = {
        getUserTimeMSec: function () {
            return new Date().getTime();
        }
    };

    // Make globally accessible
    window.a = a;

})();