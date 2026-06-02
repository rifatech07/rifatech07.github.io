(function (global) {
    'use strict';

    var TIPOS = {
        telefone: 'Telefone',
        email: 'E-mail',
        cpf: 'CPF',
        aleatoria: 'Chave aleatória'
    };

    function onlyDigits(s) {
        return String(s || '').replace(/\D/g, '');
    }

    function hint(tipo) {
        switch (tipo) {
            case 'telefone':
                return 'Celular com DDD. Pode usar só números (ex.: 31999999999 ou 5531999999999).';
            case 'email':
                return 'E-mail cadastrado no PIX (ex.: pagamento@exemplo.com).';
            case 'cpf':
                return 'CPF do titular, com ou sem pontuação (11 dígitos).';
            case 'aleatoria':
                return 'Chave aleatória do banco (UUID, ex.: 123e4567-e89b-12d3-a456-426614174000).';
            default:
                return 'Escolha o tipo e informe a chave. Deixe o tipo em "Não exibir" para ocultar no modal.';
        }
    }

    function placeholder(tipo) {
        switch (tipo) {
            case 'telefone':
                return '31999999999';
            case 'email':
                return 'seu@email.com';
            case 'cpf':
                return '000.000.000-00';
            case 'aleatoria':
                return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
            default:
                return '';
        }
    }

    function normalize(tipo, raw) {
        var v = String(raw || '').trim();
        if (!tipo || !v) return '';
        switch (tipo) {
            case 'telefone':
                return onlyDigits(v);
            case 'email':
                return v.toLowerCase();
            case 'cpf':
                return onlyDigits(v);
            case 'aleatoria':
                return v.toLowerCase();
            default:
                return v;
        }
    }

    function validate(tipo, raw) {
        if (!tipo) {
            return { ok: true, valor: '', tipo: '' };
        }
        var v = normalize(tipo, raw);
        if (!v) {
            return { ok: false, erro: 'Informe a chave PIX ou escolha "Não exibir".' };
        }
        if (tipo === 'telefone') {
            if (v.length < 10 || v.length > 13) {
                return { ok: false, erro: 'Telefone inválido. Use DDD + número (10 a 13 dígitos).' };
            }
            return { ok: true, valor: v, tipo: tipo };
        }
        if (tipo === 'email') {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
                return { ok: false, erro: 'E-mail inválido.' };
            }
            return { ok: true, valor: v, tipo: tipo };
        }
        if (tipo === 'cpf') {
            if (v.length !== 11) {
                return { ok: false, erro: 'CPF deve ter 11 dígitos.' };
            }
            return { ok: true, valor: v, tipo: tipo };
        }
        if (tipo === 'aleatoria') {
            if (v.length < 32 || v.length > 77) {
                return { ok: false, erro: 'Chave aleatória inválida (verifique o código copiado do banco).' };
            }
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) &&
                !/^[0-9a-f]{32}$/i.test(v)) {
                return { ok: false, erro: 'Formato de chave aleatória inválido (use o UUID do app do banco).' };
            }
            return { ok: true, valor: v, tipo: tipo };
        }
        return { ok: false, erro: 'Tipo de chave PIX inválido.' };
    }

    function formatDisplay(tipo, valor) {
        var v = String(valor || '');
        if (!v) return '';
        if (tipo === 'cpf' && v.length === 11) {
            return v.slice(0, 3) + '.' + v.slice(3, 6) + '.' + v.slice(6, 9) + '-' + v.slice(9);
        }
        if (tipo === 'telefone' && v.length >= 10) {
            if (v.length === 11) {
                return '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
            }
            if (v.length === 13) {
                return '+' + v.slice(0, 2) + ' (' + v.slice(2, 4) + ') ' + v.slice(4, 9) + '-' + v.slice(9);
            }
        }
        return v;
    }

    function labelTipo(tipo) {
        return TIPOS[tipo] || '';
    }

    function inferTipo(valor) {
        var v = String(valor || '').trim();
        if (!v) return '';
        if (v.indexOf('@') !== -1) return 'email';
        var low = v.toLowerCase();
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(low) ||
            /^[0-9a-f]{32}$/i.test(low)) {
            return 'aleatoria';
        }
        var d = onlyDigits(v);
        if (d.length === 11) return 'cpf';
        if (d.length >= 10 && d.length <= 13) return 'telefone';
        return 'telefone';
    }

    function effectiveTipo(cfg) {
        if (!cfg) return '';
        return cfg.chave_pix_tipo || inferTipo(cfg.chave_pix);
    }

    function shouldShow(cfg) {
        return !!(cfg && cfg.chave_pix && effectiveTipo(cfg));
    }

    global.RifaPixConfig = {
        TIPOS: TIPOS,
        hint: hint,
        placeholder: placeholder,
        normalize: normalize,
        validate: validate,
        formatDisplay: formatDisplay,
        labelTipo: labelTipo,
        inferTipo: inferTipo,
        effectiveTipo: effectiveTipo,
        shouldShow: shouldShow
    };
})(window);
