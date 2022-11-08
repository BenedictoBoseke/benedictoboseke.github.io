const subtitle = document.getElementsByClassName("card-subtitle")[0];

const createWord = (text, index) => {
    const word = document.createElement("span");

    word.innerHTML = `${text}`;
    word.classList.add("card-subtitle-word");
    word.style.transitionDelay = `${index * 7.5}ms`;

    return word;
}

const addWord = (text, index) => subtitle.appendChild(createWord(text, index));

const createSubtitle = text => text.split(" ").map(addWord);

createSubtitle("I'm a determined and adaptive person with an interest in learning new things. I can work well as a team or as an individual and I'm eager to learn further to improve myself both as a professional and as a person.")