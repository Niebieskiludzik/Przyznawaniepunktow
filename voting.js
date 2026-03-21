// voting.js
window.voting = {

  async saveVotes(voterName, players, currentRoundId){

    for (let player of players) {

      const voter = players.find(p => p.name === voterName);

      const input = document.getElementById(
        voter.id + '_' + player.id
      );

      if (!input.value) continue;

      await api.saveVote(
        currentRoundId,
        player.id,
        voterName,
        parseFloat(input.value.replace(",", "."))
      );

    }

    await api.calculateRound(currentRoundId);
  }

};
