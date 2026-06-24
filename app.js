/**
 * Questionnaire Application Logic
 */

// --- CONFIGURATION ---
const CONFIG = {
    // ⚠️ PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
    // See the README.md file for instructions on how to get this URL.
    webAppUrl: "https://script.google.com/macros/s/AKfycbxaYGc1Ws74cgobLs2mDbU7hYyYen8SPByRdAE6Q4Stq4PM_syGiLEtTOE6Yw1D6e2xNg/exec",

    // Questionnaire Questions
    questions: [
        {
            id: 1,
            emoji: "🥺",
            text: "How are you feeling right now?",
            type: "choice",
            options: ["Still upset 😢", "A bit annoyed 😡", "Just okay 😐", "Ready to hear me out 😊"]
        },
        {
            id: 2,
            emoji: "💬",
            text: "Do you think we can talk about what happened?",
            type: "choice",
            options: ["Yes, let's talk now", "Yes, but later", "I need some more time"]
        },
        {
            id: 3,
            emoji: "🍕",
            text: "If I treat you to your favorite food, will that help?",
            type: "choice",
            options: ["Definitely! 🍕", "Maybe a little...", "No, I need more than food 💔"]
        },
        {
            id: 4,
            emoji: "🧸",
            text: "Are you ready to forgive me?",
            type: "choice-evasive", // Custom type: second option runs away!
            options: ["Yes! 💕", "No 💔"]
        },
        {
            id: 5,
            emoji: "💌",
            text: "Anything else you want to say to me?",
            type: "open",
            placeholder: "Write whatever is on your mind (optional)..."
        }
    ]
};

// --- STATE MANAGEMENT ---
let currentState = {
    currentQuestionIndex: 0,
    answers: [],
    clicksCount: 0,
    startTime: null,
    evasiveAttempts: 0
};

// --- DOM ELEMENTS ---
const startCard = document.getElementById("start-card");
const questionCard = document.getElementById("question-card");
const loadingCard = document.getElementById("loading-card");
const successCard = document.getElementById("success-card");

const startBtn = document.getElementById("start-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");

const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");
const questionEmoji = document.getElementById("question-emoji");
const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const clicksDisplay = document.getElementById("click-count");
const successMessage = document.getElementById("success-message");

// --- EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
    // Start button click
    startBtn.addEventListener("click", () => {
        incrementClicks();
        startQuestionnaire();
    });

    // Back button click
    backBtn.addEventListener("click", () => {
        incrementClicks();
        handleBack();
    });

    // Restart button click
    restartBtn.addEventListener("click", () => {
        incrementClicks();
        resetQuestionnaire();
    });

    // Global click listener to track hesitation clicks
    document.body.addEventListener("click", (e) => {
        // Increment general click count on any button or input interaction
        if (e.target.closest("button") || e.target.closest(".btn-option") || e.target.closest("input") || e.target.closest("textarea")) {
            incrementClicks();
        }
    });
});

// --- CORE FUNCTIONS ---

/**
 * Increments the global clicks counter
 */
function incrementClicks() {
    currentState.clicksCount++;
    clicksDisplay.textContent = currentState.clicksCount;
}

/**
 * Transitions between cards using classes
 */
function showCard(activeCard) {
    [startCard, questionCard, loadingCard, successCard].forEach(card => {
        card.classList.add("hidden");
        card.classList.remove("active");
    });
    activeCard.classList.remove("hidden");
    activeCard.classList.add("active");
}

/**
 * Initializes the questionnaire flow
 */
function startQuestionnaire() {
    currentState.startTime = Date.now();
    currentState.currentQuestionIndex = 0;
    currentState.answers = [];
    currentState.clicksCount = 1; // Count the start button click
    currentState.evasiveAttempts = 0;
    clicksDisplay.textContent = currentState.clicksCount;

    showCard(questionCard);
    renderQuestion();
}

/**
 * Resets back to the start card
 */
function resetQuestionnaire() {
    showCard(startCard);
}

/**
 * Renders the question based on current state index
 */
function renderQuestion() {
    const question = CONFIG.questions[currentState.currentQuestionIndex];

    // Update progress bar
    const progressPercent = ((currentState.currentQuestionIndex + 1) / CONFIG.questions.length) * 100;
    progressBar.style.width = `${progressPercent}%`;
    progressText.textContent = `Question ${currentState.currentQuestionIndex + 1} of ${CONFIG.questions.length}`;

    // Update text and emoji
    questionEmoji.textContent = question.emoji;
    questionText.textContent = question.text;

    // Reset option container
    optionsContainer.innerHTML = "";

    // Toggle Back button visibility
    if (currentState.currentQuestionIndex === 0) {
        backBtn.style.visibility = "hidden";
    } else {
        backBtn.style.visibility = "visible";
    }

    // Render answer controls based on type
    if (question.type === "choice") {
        question.options.forEach(option => {
            const btn = document.createElement("button");
            btn.className = "btn btn-option";
            btn.textContent = option;
            btn.addEventListener("click", () => handleSelectOption(option));
            optionsContainer.appendChild(btn);
        });
    }
    else if (question.type === "choice-evasive") {
        currentState.evasiveAttempts = 0; // Reset count for this question

        // Positive Button ("Yes")
        const yesBtn = document.createElement("button");
        yesBtn.className = "btn btn-option";
        yesBtn.textContent = question.options[0];
        yesBtn.addEventListener("click", () => handleSelectOption(question.options[0]));

        // Evasive Negative Button ("No")
        const noBtn = document.createElement("button");
        noBtn.className = "btn btn-option evasive-btn";
        noBtn.textContent = question.options[1];

        // Playful logic to make "No" escape mouse or touch events
        const runAway = (e) => {
            e.preventDefault();
            currentState.evasiveAttempts++;
            incrementClicks();

            if (currentState.evasiveAttempts >= 5) {
                // After 5 attempts, make the "No" button convert into "Yes"
                noBtn.textContent = "Okay fine, Yes! 💕";
                noBtn.style.position = "static";
                noBtn.classList.remove("evasive-btn");
                // Remove evasive listeners so it acts like a normal click
                noBtn.removeEventListener("mouseover", runAway);
                noBtn.removeEventListener("touchstart", runAway);
                noBtn.addEventListener("click", () => handleSelectOption("Forced Yes (Tried to click No 5 times!) 💕"));
            } else {
                moveEvasiveButton(noBtn);
            }
        };

        noBtn.addEventListener("mouseover", runAway);
        noBtn.addEventListener("touchstart", runAway, { passive: false });
        noBtn.addEventListener("click", (e) => {
            // Prevent actual click in case they somehow tap it
            e.preventDefault();
            runAway(e);
        });

        optionsContainer.appendChild(yesBtn);
        optionsContainer.appendChild(noBtn);
    }
    else if (question.type === "open") {
        const textarea = document.createElement("textarea");
        textarea.className = "text-area-input";
        textarea.placeholder = question.placeholder || "Type your answer here...";

        // If they already answered this question, reload their text
        const existingAnswer = currentState.answers[currentState.currentQuestionIndex];
        if (existingAnswer) {
            textarea.value = existingAnswer.answer;
        }

        const nextBtn = document.createElement("button");
        nextBtn.className = "btn btn-primary btn-block";
        nextBtn.innerHTML = `
            <span>Submit Answers</span>
            <i class="fa-solid fa-paper-plane btn-icon"></i>
        `;
        nextBtn.addEventListener("click", () => {
            const val = textarea.value.trim() || "No custom message provided";
            handleSelectOption(val);
        });

        optionsContainer.appendChild(textarea);
        optionsContainer.appendChild(nextBtn);
    }
}

/**
 * Calculates a random coordinates bounding box inside the card and positions the evasive button
 */
function moveEvasiveButton(btn) {
    const cardBody = document.querySelector(".card-body");
    const bodyRect = cardBody.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    // Ensure position absolute is set
    btn.style.position = "absolute";
    btn.style.zIndex = "100";

    // Calculate random X and Y bounds within the card
    const maxX = bodyRect.width - btnRect.width - 20;
    const maxY = bodyRect.height - btnRect.height - 20;

    const randomX = Math.max(10, Math.floor(Math.random() * maxX));
    const randomY = Math.max(10, Math.floor(Math.random() * maxY));

    btn.style.left = `${randomX}px`;
    btn.style.top = `${randomY}px`;
}

/**
 * Saves selected answer and advances the questionnaire state
 */
function handleSelectOption(answerText) {
    const question = CONFIG.questions[currentState.currentQuestionIndex];

    // Record or update the answer
    currentState.answers[currentState.currentQuestionIndex] = {
        questionId: question.id,
        questionText: question.text,
        answer: answerText
    };

    // Check if we have more questions or if we should submit
    if (currentState.currentQuestionIndex < CONFIG.questions.length - 1) {
        currentState.currentQuestionIndex++;
        renderQuestion();
    } else {
        submitQuestionnaire();
    }
}

/**
 * Goes back to the previous question
 */
function handleBack() {
    if (currentState.currentQuestionIndex > 0) {
        currentState.currentQuestionIndex--;
        renderQuestion();
    }
}

/**
 * Package state data and send to Google Sheet via fetch POST
 */
function submitQuestionnaire() {
    showCard(loadingCard);

    const timeSpentSeconds = Math.round((Date.now() - currentState.startTime) / 1000);

    const payload = {
        timestamp: new Date().toISOString(),
        totalQuestions: CONFIG.questions.length,
        answeredQuestions: currentState.answers.length,
        totalClicks: currentState.clicksCount,
        timeSpentSeconds: timeSpentSeconds,
        answers: currentState.answers
    };

    console.log("💌 Form Submission Payload:", payload);

    // If WebApp URL is not configured, run in Mock Mode for testing
    if (!CONFIG.webAppUrl || CONFIG.webAppUrl === "PASTE_YOUR_COPIED_URL_HERE") {
        console.warn("⚠️ Google Apps Script Web App URL is not set. Running in MOCK MODE.");

        // Mock API call delay
        setTimeout(() => {
            showCard(successCard);
            successMessage.innerHTML = `
                Your answers have been simulated! 💌<br><br>
                <div style="font-size: 13px; text-align: left; background: #fff0f2; border: 1px dashed #ffb6c1; border-radius: 8px; padding: 12px; margin-top: 15px; color: #b03060;">
                    <strong>🔍 Developer Information:</strong><br>
                    To receive actual submissions in your email and Google Sheets, please configure your <code>webAppUrl</code> inside <code>app.js</code> as described in the <strong>README.md</strong>.
                </div>
            `;
        }, 2000);
        return;
    }

    // Actual submission to Apps Script Endpoint
    fetch(CONFIG.webAppUrl, {
        method: "POST",
        mode: "no-cors", // Required for Google Web App redirection without CORS headers
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
        .then(() => {
            // fetch with no-cors doesn't allow inspecting the response, but it will execute successfully
            showCard(successCard);
            successMessage.textContent = "Your answers have been sent. I really appreciate your time and honesty. Let's talk soon! ✨";
        })
        .catch(error => {
            console.error("❌ Submission Error:", error);
            showCard(successCard);
            // Fallback: show success card anyway since no-cors sometimes triggers catch depending on browser sandboxes, or notify of issue
            successMessage.innerHTML = `
            Your answers were recorded locally, but we had trouble reaching the spreadsheet.<br><br>
            Error details: <code style="font-size: 12px; color: red;">${error.message}</code>
        `;
        });
}
