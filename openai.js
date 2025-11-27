async function askGPT5Nano(question) {
  return new Promise((resolve, reject) => {
    puter.ai.chat(question, { model: "gpt-5-nano" })
      .then(response => resolve(response))
      .catch(err => reject(err));
  });
}
