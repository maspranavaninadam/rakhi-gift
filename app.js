document.addEventListener("DOMContentLoaded", () => {
    const introPanel = document.getElementById("introPanel");
    const introText = document.getElementById("introText");
    const introLock = document.getElementById("introLock");
    const introTimer = document.getElementById("introTimer");

    const selectScreen = document.getElementById("selectScreen");
    const tagList = document.getElementById("tagList");

    const pinPanel = document.getElementById("pinPanel");
    const pinName = document.getElementById("pinName");
    const pinInput = document.getElementById("pinInput");
    const pinSubmit = document.getElementById("pinSubmit");
    const pinError = document.getElementById("pinError");
    const backFromPin = document.getElementById("backFromPin");

    const lockedPanel = document.getElementById("lockedPanel");
    const lockedName = document.getElementById("lockedName");
    const timer = document.getElementById("timer");
    const backFromLocked = document.getElementById("backFromLocked");

    const messagePanel = document.getElementById("messagePanel");
    const messageTo = document.getElementById("messageTo");
    const messageBody = document.getElementById("messageBody");
    const messageSign = document.getElementById("messageSign");
    const listenBtn = document.getElementById("listenBtn");
    const backFromMessage = document.getElementById("backFromMessage");

    const soundToggle = document.getElementById("soundToggle");

    let selectedMember = null;

    let countdownInterval = null;
    let introCountdownInterval = null;

    let soundEnabled = true;
    let speechActive = false;


    /* =====================================================
       Helpers
       ===================================================== */

    function show(element) {
        element.classList.remove("hidden");
    }

    function hide(element) {
        element.classList.add("hidden");
    }


    function formatTime(milliseconds) {
        if (milliseconds <= 0) {
            return "00:00:00";
        }

        const totalSeconds = Math.floor(milliseconds / 1000);

        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (days > 0) {
            return `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        }

        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }


    function getTargetDate(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return date;
    }


    function isPast(value) {
        const target = getTargetDate(value);

        return target && Date.now() >= target.getTime();
    }


    function stopTimers() {
        clearInterval(countdownInterval);
        clearInterval(introCountdownInterval);

        countdownInterval = null;
        introCountdownInterval = null;
    }


    function setScreen(screen) {
        hide(selectScreen);
        hide(pinPanel);
        hide(lockedPanel);
        hide(messagePanel);

        show(screen);
    }


    /* =====================================================
       Sound
       ===================================================== */

    function playUnlockSound() {
        if (!soundEnabled) {
            return;
        }

        try {
            const AudioContext =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioContext) {
                return;
            }

            const context = new AudioContext();

            const oscillator = context.createOscillator();
            const gain = context.createGain();

            oscillator.type = "sine";

            oscillator.frequency.setValueAtTime(
                523.25,
                context.currentTime
            );

            oscillator.frequency.exponentialRampToValueAtTime(
                783.99,
                context.currentTime + 0.22
            );

            gain.gain.setValueAtTime(
                0.0001,
                context.currentTime
            );

            gain.gain.exponentialRampToValueAtTime(
                0.12,
                context.currentTime + 0.02
            );

            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                context.currentTime + 0.45
            );

            oscillator.connect(gain);
            gain.connect(context.destination);

            oscillator.start();

            oscillator.stop(
                context.currentTime + 0.45
            );

            oscillator.addEventListener("ended", () => {
                context.close();
            });

        } catch (error) {
            console.warn(
                "Could not play unlock sound.",
                error
            );
        }
    }


    /* =====================================================
       Intro
       ===================================================== */

    function initializeIntro() {
        introText.innerHTML = INTRO_MESSAGE;

        if (isPast(INTRO_UNLOCK_TIME)) {
            unlockIntro();
            return;
        }

        lockIntro();
        startIntroCountdown();
    }


    function lockIntro() {
        introText.style.visibility = "hidden";
        introLock.style.display = "flex";
    }


    function unlockIntro() {
        clearInterval(introCountdownInterval);

        introLock.style.display = "none";
        introText.style.visibility = "visible";

        introPanel.animate(
            [
                {
                    transform: "scale(0.98)",
                    opacity: 0.75
                },
                {
                    transform: "scale(1)",
                    opacity: 1
                }
            ],
            {
                duration: 550,
                easing: "cubic-bezier(.2,.8,.2,1)"
            }
        );

        playUnlockSound();
    }


    function startIntroCountdown() {
        clearInterval(introCountdownInterval);

        function update() {
            const target =
                getTargetDate(INTRO_UNLOCK_TIME);

            if (!target) {
                introTimer.textContent = "Invalid time";
                return;
            }

            const remaining =
                target.getTime() - Date.now();

            if (remaining <= 0) {
                unlockIntro();
                return;
            }

            introTimer.textContent =
                formatTime(remaining);
        }

        update();

        introCountdownInterval =
            setInterval(update, 1000);
    }


    /* =====================================================
       Family names
       ===================================================== */

    function renderMembers() {
        tagList.innerHTML = "";

        MEMBERS.forEach((member) => {
            const li = document.createElement("li");

            const button =
                document.createElement("button");

            button.type = "button";
            button.className = "name-tag";
            button.textContent = member.name;

            button.addEventListener(
                "click",
                () => selectMember(member)
            );

            li.appendChild(button);
            tagList.appendChild(li);
        });
    }


    /* =====================================================
       Member selection / PIN
       ===================================================== */

    function selectMember(member) {
        selectedMember = member;

        stopTimers();

        pinName.textContent = member.name;

        pinInput.value = "";
        pinError.textContent = "";

        setScreen(pinPanel);

        requestAnimationFrame(() => {
            pinInput.focus();
        });
    }


    function submitPin() {
        if (!selectedMember) {
            return;
        }

        const enteredPin =
            pinInput.value.trim();

        if (
            enteredPin ===
            String(selectedMember.pin)
        ) {
            pinError.textContent = "";

            playUnlockSound();

            if (isPast(UNLOCK_TIME)) {
                showMessage();
            } else {
                showLocked();
            }

            return;
        }

        pinError.textContent =
            "That knot didn't open. Try again.";

        pinInput.classList.remove("shake");

        void pinInput.offsetWidth;

        pinInput.classList.add("shake");

        pinInput.focus();
    }


    pinSubmit.addEventListener(
        "click",
        submitPin
    );


    pinInput.addEventListener(
        "keydown",
        (event) => {
            if (event.key === "Enter") {
                submitPin();
            }
        }
    );


    /* =====================================================
       Locked screen
       ===================================================== */

    function showLocked() {
        if (!selectedMember) {
            return;
        }

        lockedName.textContent =
            selectedMember.name;

        setScreen(lockedPanel);

        startMemberCountdown();
    }


    function startMemberCountdown() {
        clearInterval(countdownInterval);

        function update() {
            const target =
                getTargetDate(UNLOCK_TIME);

            if (!target) {
                timer.textContent =
                    "Invalid time";

                return;
            }

            const remaining =
                target.getTime() - Date.now();

            if (remaining <= 0) {
                clearInterval(countdownInterval);

                showMessage();

                return;
            }

            timer.textContent =
                formatTime(remaining);
        }

        update();

        countdownInterval =
            setInterval(update, 1000);
    }


    /* =====================================================
       MESSAGE REVEAL
       ===================================================== */

    function showMessage() {
        if (!selectedMember) {
            return;
        }

        stopTimers();

        messageTo.textContent =
            selectedMember.name;

        messageSign.textContent =
            selectedMember.sign || "";

        messageBody.innerHTML = "";
        messageSign.classList.remove("signature-reveal");

        setScreen(messagePanel);

        /*
         * Render the message body and animate blocks
         * into view as the user scrolls to them.
         */
        revealMessageBlocks(
            selectedMember.body
        );

        playUnlockSound();
    }


    function revealMessageBlocks(blocks) {
        /*
         * Render everything immediately, in order.
         * Scroll-in animation (if any) is handled by
         * IntersectionObserver, not by delayed rendering.
         */
        if (!Array.isArray(blocks)) {
            /*
             * Backwards compatibility:
             * If body is still a simple string.
             */
            if (typeof blocks === "string") {
                const text =
                    createTextBlock(blocks);

                messageBody.appendChild(text);
                observeForScrollIn(text);

                return;
            }

            return;
        }

        blocks.forEach((block) => {
            const element = createBlockElement(block);

            if (!element) {
                return;
            }

            messageBody.appendChild(element);
            observeForScrollIn(element);
        });

        messageSign.classList.add("signature-reveal");
    }


    function createBlockElement(block) {
        if (!block || !block.type) {
            return null;
        }

        if (block.type === "text") {
            return createTextBlock(block.content);
        }

        if (block.type === "gif") {
            return createGifBlock(block);
        }

        return null;
    }


    function createTextBlock(content) {
        const element =
            document.createElement("div");

        element.className =
            "message-text-block";

        element.textContent =
            content || "";

        return element;
    }


    function createGifBlock(block) {
        if (!block.url) {
            return null;
        }

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "message-gif-block";


        const image =
            document.createElement("img");

        image.src = block.url;

        image.alt =
            block.alt || "Rakhi meme";


        image.loading = "lazy";


        image.addEventListener(
            "error",
            () => {
                wrapper.remove();
            }
        );


        wrapper.appendChild(image);

        return wrapper;
    }


    const prefersReducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

    let scrollInObserver = null;

    function getScrollInObserver() {
        if (prefersReducedMotion) {
            return null;
        }

        if (scrollInObserver) {
            return scrollInObserver;
        }

        scrollInObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add(
                        "block-in-view"
                    );

                    observer.unobserve(entry.target);
                });
            },
            {
                threshold: 0.15
            }
        );

        return scrollInObserver;
    }

    function observeForScrollIn(element) {
        /*
         * Reduced motion: show immediately, skip animation.
         */
        if (prefersReducedMotion) {
            element.classList.add("block-in-view");
            return;
        }

        element.classList.add("block-scroll-in");

        const observer = getScrollInObserver();

        if (!observer) {
            element.classList.add("block-in-view");
            return;
        }

        observer.observe(element);
    }


    /* =====================================================
       Text to speech
       ===================================================== */

    function speakMessage() {
        if (
            !selectedMember ||
            !("speechSynthesis" in window)
        ) {
            return;
        }


        if (speechActive) {
            window.speechSynthesis.cancel();

            speechActive = false;

            listenBtn.textContent =
                "🔊 Read this aloud";

            return;
        }


        const textBlocks =
            Array.isArray(selectedMember.body)
                ? selectedMember.body
                    .filter(
                        block =>
                            block.type === "text"
                    )
                    .map(
                        block =>
                            block.content
                    )
                    .join(". ")
                : selectedMember.body;


        const text = [
            "Happy Rakhi",
            selectedMember.name,
            textBlocks,
            selectedMember.sign
        ]
            .filter(Boolean)
            .join(". ");


        const utterance =
            new SpeechSynthesisUtterance(text);


        utterance.lang =
            selectedMember.lang || "en-IN";

        utterance.rate = 0.9;
        utterance.pitch = 1.05;


        utterance.onstart = () => {
            speechActive = true;

            listenBtn.textContent =
                "⏹ Stop reading";
        };


        utterance.onend = () => {
            speechActive = false;

            listenBtn.textContent =
                "🔊 Read this aloud";
        };


        utterance.onerror = () => {
            speechActive = false;

            listenBtn.textContent =
                "🔊 Read this aloud";
        };


        window.speechSynthesis.cancel();

        window.speechSynthesis.speak(
            utterance
        );
    }


    listenBtn.addEventListener(
        "click",
        speakMessage
    );


    /* =====================================================
       Navigation
       ===================================================== */

    function goToNames() {
        stopTimers();

        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }

        speechActive = false;

        listenBtn.textContent =
            "🔊 Read this aloud";

        selectedMember = null;

        setScreen(selectScreen);
    }


    backFromPin.addEventListener(
        "click",
        goToNames
    );

    backFromLocked.addEventListener(
        "click",
        goToNames
    );

    backFromMessage.addEventListener(
        "click",
        goToNames
    );


    /* =====================================================
       Sound toggle
       ===================================================== */

    soundToggle.addEventListener(
        "click",
        () => {
            soundEnabled =
                !soundEnabled;

            soundToggle.textContent =
                soundEnabled
                    ? "🔊"
                    : "🔇";

            soundToggle.setAttribute(
                "aria-label",
                soundEnabled
                    ? "Disable unlock sound"
                    : "Enable unlock sound"
            );
        }
    );


    /* =====================================================
       Tab visibility
       ===================================================== */

    document.addEventListener(
        "visibilitychange",
        () => {
            if (document.hidden) {
                return;
            }


            if (!isPast(INTRO_UNLOCK_TIME)) {
                startIntroCountdown();
            }


            if (
                selectedMember &&
                !isPast(UNLOCK_TIME) &&
                !lockedPanel.classList.contains(
                    "hidden"
                )
            ) {
                startMemberCountdown();
            }
        }
    );


    /* =====================================================
       Initialize
       ===================================================== */

    renderMembers();

    initializeIntro();

    setScreen(selectScreen);
});
