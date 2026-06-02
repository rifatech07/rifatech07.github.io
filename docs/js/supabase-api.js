(function (global) {
    'use strict';

    var client = null;

    function cfg() {
        return global.RIFA_CONFIG || {};
    }

    function getClient() {
        if (client) return client;
        var c = cfg();
        if (!c.supabaseUrl || !c.supabaseAnonKey) {
            throw new Error('Configure js/config.js com supabaseUrl e supabaseAnonKey.');
        }
        if (!global.supabase) {
            throw new Error('Biblioteca Supabase não carregada.');
        }
        client = global.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false
            }
        });
        return client;
    }

    function rpcError(error) {
        return { ok: false, erro: (error && error.message) || 'Erro de conexão.' };
    }

    function adminRow(row) {
        return {
            cota: row.cota,
            numero1: row.numero1,
            numero2: row.numero2,
            numero3: row.numero3,
            comprador: row.comprador || '',
            identificador: row.identificador || '',
            status: row.status,
            pagamento: row.pagamento || '',
            reservado_em: row.reservado_em || null,
            whatsapp: row.whatsapp || ''
        };
    }

    var CONFIG_DEFAULTS = {
        whatsapp: '5531982635834',
        premio: 'Caixa de Som JBL',
        valor_cota: 'R$ 10,00',
        data_sorteio: '30/06/2026',
        chave_pix: '',
        chave_pix_tipo: ''
    };

    function configRow(row) {
        return {
            whatsapp: (row && row.whatsapp) || CONFIG_DEFAULTS.whatsapp,
            premio: (row && row.premio) || CONFIG_DEFAULTS.premio,
            valor_cota: (row && row.valor_cota) || CONFIG_DEFAULTS.valor_cota,
            data_sorteio: (row && row.data_sorteio) || CONFIG_DEFAULTS.data_sorteio,
            chave_pix: (row && row.chave_pix) || CONFIG_DEFAULTS.chave_pix,
            chave_pix_tipo: (row && row.chave_pix_tipo) || CONFIG_DEFAULTS.chave_pix_tipo
        };
    }

    global.RifaAPI = {
        getClient: getClient,
        configDefaults: CONFIG_DEFAULTS,

        fetchRifaConfig: function () {
            return getClient()
                .from('rifa_config')
                .select('whatsapp,premio,valor_cota,data_sorteio,chave_pix,chave_pix_tipo')
                .eq('id', 1)
                .maybeSingle()
                .then(function (res) {
                    if (res.error) throw res.error;
                    return configRow(res.data);
                })
                .catch(function () {
                    return Object.assign({}, CONFIG_DEFAULTS);
                });
        },

        updateRifaConfig: function (payload) {
            var whatsapp = String(payload.whatsapp || '').replace(/\D/g, '');
            if (whatsapp.length < 10) {
                return Promise.resolve({ ok: false, erro: 'WhatsApp inválido. Use DDI + DDD + número.' });
            }
            var premio = String(payload.premio || '').trim();
            var valorCota = String(payload.valor_cota || payload.valorCota || '').trim();
            var dataSorteio = String(payload.data_sorteio || payload.dataSorteio || '').trim();
            var chavePixTipo = String(payload.chave_pix_tipo || payload.chavePixTipo || '').trim();
            var chavePixRaw = String(payload.chave_pix || payload.chavePix || '').trim();
            var pixCheck = { ok: true, valor: '', tipo: '' };
            if (global.RifaPixConfig) {
                pixCheck = global.RifaPixConfig.validate(chavePixTipo, chavePixRaw);
            } else if (chavePixTipo && chavePixRaw) {
                pixCheck = { ok: true, valor: chavePixRaw, tipo: chavePixTipo };
            } else if (chavePixTipo || chavePixRaw) {
                return Promise.resolve({ ok: false, erro: 'Informe o tipo e a chave PIX, ou escolha "Não exibir".' });
            }
            if (!pixCheck.ok) {
                return Promise.resolve({ ok: false, erro: pixCheck.erro });
            }
            if (premio.length < 2) {
                return Promise.resolve({ ok: false, erro: 'Informe o prêmio.' });
            }
            if (valorCota.length < 1) {
                return Promise.resolve({ ok: false, erro: 'Informe o valor da cota.' });
            }
            if (dataSorteio.length < 4) {
                return Promise.resolve({ ok: false, erro: 'Informe a data do sorteio.' });
            }
            return getClient()
                .from('rifa_config')
                .update({
                    whatsapp: whatsapp,
                    premio: premio,
                    valor_cota: valorCota,
                    data_sorteio: dataSorteio,
                    chave_pix: pixCheck.valor,
                    chave_pix_tipo: pixCheck.tipo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', 1)
                .select('whatsapp,premio,valor_cota,data_sorteio,chave_pix,chave_pix_tipo')
                .single()
                .then(function (res) {
                    if (res.error) return { ok: false, erro: res.error.message };
                    return { ok: true, body: configRow(res.data) };
                });
        },

        fetchCotasPublic: function () {
            return getClient()
                .from('cotas_public')
                .select('*')
                .order('cota')
                .then(function (res) {
                    if (res.error) throw res.error;
                    return res.data || [];
                });
        },

        reservar: function (cota, comprador, whatsapp) {
            return getClient()
                .rpc('reservar_cota', {
                    p_cota: cota,
                    p_comprador: comprador,
                    p_whatsapp: whatsapp
                })
                .then(function (res) {
                    if (res.error) return rpcError(res.error);
                    var body = res.data;
                    if (!body || !body.ok) {
                        return { ok: false, erro: (body && body.erro) || 'Não foi possível reservar.' };
                    }
                    return { ok: true, body: body };
                });
        },

        adminLogin: function (email, password) {
            return getClient().auth.signInWithPassword({ email: email, password: password });
        },

        adminLogout: function () {
            return getClient().auth.signOut();
        },

        getSession: function () {
            return getClient().auth.getSession();
        },

        onAuthChange: function (cb) {
            return getClient().auth.onAuthStateChange(cb);
        },

        fetchCotasAdmin: function () {
            return getClient().auth.getSession().then(function (sessionRes) {
                if (!sessionRes.data || !sessionRes.data.session) {
                    throw new Error('Sessão não encontrada. Faça login novamente.');
                }
                return getClient().rpc('admin_list_cotas');
            }).then(function (res) {
                if (res.error) throw res.error;
                var body = res.data;
                if (!body || !body.ok) {
                    throw new Error((body && body.erro) || 'Erro ao carregar cotas.');
                }
                return (body.cotas || []).map(adminRow);
            });
        },

        confirmarPagamento: function (cota) {
            return getClient()
                .rpc('confirmar_pagamento', { p_cota: cota })
                .then(function (res) {
                    if (res.error) return rpcError(res.error);
                    var body = res.data;
                    if (!body || !body.ok) {
                        return { ok: false, erro: (body && body.erro) || 'Erro ao confirmar.' };
                    }
                    return { ok: true, body: body };
                });
        },

        resetAll: function () {
            return getClient()
                .rpc('admin_reset_all')
                .then(function (res) {
                    if (res.error) return rpcError(res.error);
                    var body = res.data;
                    if (!body || !body.ok) {
                        return { ok: false, erro: (body && body.erro) || 'Erro.' };
                    }
                    return { ok: true, body: body };
                });
        },

        bulkStatus: function (cotas, status) {
            return getClient()
                .rpc('admin_bulk_status', { p_cotas: cotas, p_status: status })
                .then(function (res) {
                    if (res.error) return rpcError(res.error);
                    var body = res.data;
                    if (!body || !body.ok) {
                        return { ok: false, erro: (body && body.erro) || 'Erro.' };
                    }
                    return { ok: true, body: body };
                });
        },

        createCota: function (payload) {
            return getClient()
                .from('cotas')
                .insert([payload])
                .select()
                .single()
                .then(function (res) {
                    if (res.error) return { ok: false, erro: res.error.message };
                    return { ok: true, body: { cota: adminRow(res.data) } };
                });
        },

        updateCota: function (cota, payload) {
            return getClient()
                .from('cotas')
                .update(payload)
                .eq('cota', cota)
                .select()
                .single()
                .then(function (res) {
                    if (res.error) return { ok: false, erro: res.error.message };
                    return { ok: true, body: { cota: adminRow(res.data) } };
                });
        },

        liberarCota: function (cota) {
            return getClient()
                .from('cotas')
                .update({
                    comprador: '',
                    whatsapp: '',
                    identificador: '',
                    status: 'LIVRE',
                    pagamento: '',
                    reservado_em: null
                })
                .eq('cota', cota)
                .then(function (res) {
                    if (res.error) return { ok: false, erro: res.error.message };
                    return { ok: true };
                });
        }
    };
})(window);
