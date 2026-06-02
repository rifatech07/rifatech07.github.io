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
        client = global.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey);
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

    global.RifaAPI = {
        getClient: getClient,

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
            return getClient()
                .from('cotas')
                .select('*')
                .order('cota')
                .then(function (res) {
                    if (res.error) throw res.error;
                    return (res.data || []).map(adminRow);
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
