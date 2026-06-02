(function (global) {
    'use strict';

    function defaults() {
        return global.RifaAPI && global.RifaAPI.configDefaults
            ? Object.assign({}, global.RifaAPI.configDefaults)
            : { whatsapp: '5531982635834', premio: 'Caixa de Som JBL', valor_cota: 'R$ 10,00', data_sorteio: '30/06/2026', chave_pix: '', chave_pix_tipo: '' };
    }

    function subtitleText(c) {
        return 'Prêmio: ' + c.premio + ' · Cota: ' + c.valor_cota + ' · Sorteio: ' + c.data_sorteio;
    }

    function apply(cfg) {
        var c = cfg || defaults();
        var prize = document.getElementById('home-prize');
        var valor = document.getElementById('home-valor');
        var date = document.getElementById('home-date');
        var sub = document.querySelector('.topbar__subtitle');
        if (prize) prize.textContent = 'Prêmio: ' + c.premio;
        if (valor) valor.textContent = 'Valor da cota: ' + c.valor_cota;
        if (date) date.textContent = 'Sorteio: ' + c.data_sorteio;
        if (sub) sub.textContent = subtitleText(c);
        return c;
    }

    global.RifaPublic = {
        load: function () {
            if (!global.RifaAPI) return Promise.resolve(defaults());
            return global.RifaAPI.fetchRifaConfig();
        },
        apply: apply,
        subtitleText: subtitleText,
        whatsappUrl: function (text, cfg) {
            var c = cfg || defaults();
            var num = String(c.whatsapp || '').replace(/\D/g, '');
            return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text || 'Olá! Gostaria de reservar uma cota da rifa.');
        }
    };
})(window);
