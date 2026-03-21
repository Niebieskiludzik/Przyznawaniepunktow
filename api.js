window.api = {

  async getPlayers(){
    const { data } = await window.supabaseClient
      .from('players')
      .select('*')
      .order('rating', { ascending: false });

    return data || [];
  },

  async addPlayer(name){
    return await window.supabaseClient
      .from('players')
      .insert({ name });
  },

  async saveVote(roundId, playerId, voterName, score){
    return await window.supabaseClient
      .from('votes')
      .upsert({
        round_id: roundId,
        player_id: playerId,
        voter_name: voterName,
        score
      });
  },

  async calculateRound(roundId){
    return await window.supabaseClient.rpc('calculate_round', {
      p_round_id: roundId
    });
  }

};

// PLAYERS
window.api = {

  async getPlayers(){
    const { data } = await window.supabaseClient
      .from('players')
      .select('*')
      .order('rating', { ascending: false });

    return data || [];
  },

  async addPlayer(name){
    return await window.supabaseClient.from('players').insert({ name });
  },

  async saveVote(roundId, playerId, voterName, score){
    return await window.supabaseClient.from('votes').upsert({
      round_id: roundId,
      player_id: playerId,
      voter_name: voterName,
      score
    });
  },

  async calculateRound(roundId){
    return await window.supabaseClient.rpc('calculate_round', {
      p_round_id: roundId
    });
  }

};
