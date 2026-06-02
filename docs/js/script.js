(function () {
    'use strict';

    let rifaConfig = {
        whatsapp: '5531982635834',
        premio: 'Caixa de Som JBL',
        valor_cota: 'R$ 10,00',
        data_sorteio: '30/06/2026',
        chave_pix: '',
        chave_pix_tipo: ''
    };
    const STORAGE_RESERVAS = 'rifa-minhas-reservas';
    const REFRESH_MS = 15000;

    (function limparAcessoNovo() {
        var params = new URLSearchParams(window.location.search);
        if (params.get('novo') === '1' || params.get('limpar') === '1') {
            localStorage.removeItem(STORAGE_RESERVAS);
            params.delete('novo');
            params.delete('limpar');
            var qs = params.toString();
            var url = window.location.pathname + (qs ? '?' + qs : '');
            window.history.replaceState({}, '', url);
        }
    })();

    const PAGE_INTERVAL = 50;

    let allData = [];
    let sortAsc = true;
    let refreshTimer = null;
    let currentPage = 1;
    let pageSize = PAGE_INTERVAL;

    const tbody = document.getElementById('tbody');
    const cotasMobile = document.getElementById('cotas-mobile');
    const searchInput = document.getElementById('search');
    const filterStatus = document.getElementById('filter-status');
    const rangeSelect = document.getElementById('range-select');
    const paginacao = document.getElementById('paginacao');
    const pagPrev = document.getElementById('pag-prev');
    const pagNext = document.getElementById('pag-next');
    const pagInfo = document.getElementById('pag-info');
    const btnSort = document.getElementById('btn-sort');
    const sortLabel = document.getElementById('sort-label');
    const btnTheme = document.getElementById('btn-theme');
    const btnReservar = document.getElementById('btn-reservar');
    const btnRetomar = document.getElementById('btn-retomar');
    const whatsappBtn = document.getElementById('whatsapp-btn');

    const retomarBanner = document.getElementById('retomar-banner');
    const retomarBannerTitle = document.getElementById('retomar-banner-title');
    const retomarBannerDesc = document.getElementById('retomar-banner-desc');
    const retomarBannerBtn = document.getElementById('retomar-banner-btn');

    const modalRetomar = document.getElementById('modal-retomar');
    const retomarClose = document.getElementById('retomar-close');
    const retomarCancel = document.getElementById('retomar-cancel');
    const formRetomar = document.getElementById('form-retomar');
    const retomarId = document.getElementById('retomar-id');
    const retomarError = document.getElementById('retomar-error');
    const btnRetomarEnviar = document.getElementById('btn-retomar-enviar');

    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const formReserva = document.getElementById('form-reserva');
    const reservaCota = document.getElementById('reserva-cota');
    const reservaNome = document.getElementById('reserva-nome');
    const reservaWhatsapp = document.getElementById('reserva-whatsapp');
    const formError = document.getElementById('form-error');
    const btnConfirmar = document.getElementById('btn-confirmar');

    const modalSucesso = document.getElementById('modal-sucesso');
    const sucessoMsg = document.getElementById('sucesso-msg');
    const btnWhatsappPagar = document.getElementById('btn-whatsapp-pagar');
    const btnSucessoFechar = document.getElementById('btn-sucesso-fechar');
    const modalPixBox = document.getElementById('modal-pix-box');
    const modalPixLabel = document.getElementById('modal-pix-label');
    const modalPixValue = document.getElementById('modal-pix-value');
    const btnCopyPix = document.getElementById('btn-copy-pix');
    const sucessoId = document.getElementById('sucesso-id');
    const sucessoIdCode = document.getElementById('sucesso-id-code');

    function getMinhasReservasMap() {
        try {
            var raw = localStorage.getItem(STORAGE_RESERVAS);
            if (!raw) return {};
            var parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                var map = {};
                parsed.forEach(function (c) { map[c] = { nome: '' }; });
                return map;
            }
            return parsed;
        } catch (e) {
            return {};
        }
    }

    function isMinhaReserva(cota) {
        return Object.prototype.hasOwnProperty.call(getMinhasReservasMap(), cota);
    }

    function reservaAguardaPagamento(item) {
        return !!(item && item.status === 'RESERVADA' && item.pagamento === 'PENDENTE');
    }

    function reservaAindaEhMinha(item, info) {
        if (!item) return false;
        if (info && info.identificador && item.identificador) {
            return normalizarIdentificador(info.identificador) === normalizarIdentificador(item.identificador);
        }
        return true;
    }

    function limparReservasAntigas(data) {
        var map = getMinhasReservasMap();
        var alterou = false;

        Object.keys(map).forEach(function (cota) {
            var info = map[cota] || {};
            var item = data.find(function (d) { return d.cota === cota; });
            var manter = false;

            if (item && reservaAindaEhMinha(item, info)) {
                if (reservaAguardaPagamento(item)) {
                    manter = true;
                } else if (item.status === 'VENDIDA' && item.pagamento === 'PAGO') {
                    manter = true;
                }
            }

            if (!manter) {
                delete map[cota];
                alterou = true;
            }
        });

        if (alterou) {
            localStorage.setItem(STORAGE_RESERVAS, JSON.stringify(map));
        }
    }

    function salvarMinhaReserva(cota, nome, identificador) {
        var map = getMinhasReservasMap();
        map[cota] = { nome: nome, identificador: identificador || '' };
        localStorage.setItem(STORAGE_RESERVAS, JSON.stringify(map));
    }

    function buildWhatsAppUrl(cotaData, nome, identificador) {
        var msg =
            'Olá! Reservei a cota *' + cotaData.cota + '* da Rifa Solidária.\n\n' +
            '🆔 Identificador: *' + identificador + '*\n';
        if (nome) {
            msg += '👤 Nome: ' + nome + '\n';
        }
        msg +=
            '🎟️ Números: ' + cotaData.numero1 + ' · ' + cotaData.numero2 + ' · ' + cotaData.numero3 + '\n' +
            '💰 Valor: ' + (rifaConfig.valor_cota || '—') + '\n\n' +
            'Gostaria de enviar o comprovante de pagamento (PIX). Aguardo confirmação!';
        return 'https://wa.me/' + String(rifaConfig.whatsapp || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(msg);
    }

    function normalizarIdentificador(value) {
        return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
    }

    function encontrarReservaPorIdentificador(identificador) {
        var idNorm = normalizarIdentificador(identificador);
        if (!idNorm) return null;
        return allData.find(function (item) {
            return normalizarIdentificador(item.identificador) === idNorm;
        }) || null;
    }

    function getPendentesMinhasReservas() {
        var map = getMinhasReservasMap();
        var pendentes = [];
        Object.keys(map).forEach(function (cota) {
            var info = map[cota] || {};
            var item = allData.find(function (d) { return d.cota === cota; });
            if (item && reservaAindaEhMinha(item, info) && reservaAguardaPagamento(item)) {
                pendentes.push({ cota: cota, item: item, info: info });
            }
        });
        return pendentes;
    }

    function abrirWhatsAppReserva(item, info) {
        var identificador = (info && info.identificador) || item.identificador;
        var nome = (info && info.nome) || '';
        window.open(buildWhatsAppUrl(item, nome, identificador), '_blank');
    }

    function vincularReservaLocal(item, nome) {
        salvarMinhaReserva(item.cota, nome || '', item.identificador);
    }

    function retomarPagamento(identificador, nomeOpcional) {
        var item = encontrarReservaPorIdentificador(identificador);
        if (!item) {
            return { ok: false, erro: 'Identificador não encontrado. Confira o código na tabela (coluna Identificador).' };
        }
        if (item.status === 'VENDIDA' && item.pagamento === 'PAGO') {
            return { ok: false, erro: 'Esta reserva já foi confirmada e paga. Obrigado!' };
        }
        if (!reservaAguardaPagamento(item)) {
            return { ok: false, erro: 'Esta cota não está aguardando pagamento no momento.' };
        }
        vincularReservaLocal(item, nomeOpcional);
        renderTable();
        abrirWhatsAppReserva(item, { nome: nomeOpcional || '', identificador: item.identificador });
        return { ok: true, item: item };
    }

    function atualizarBannerRetomar() {
        limparReservasAntigas(allData);
        var pendentes = getPendentesMinhasReservas();
        if (pendentes.length === 0) {
            retomarBanner.hidden = true;
            return;
        }
        var primeiro = pendentes[0];
        retomarBanner.hidden = false;
        if (pendentes.length === 1) {
            retomarBannerTitle.textContent = 'Sua reserva aguarda pagamento';
            retomarBannerDesc.textContent =
                'Cota ' + primeiro.item.cota + ' · ' + primeiro.item.identificador +
                ' — envie o comprovante pelo WhatsApp para confirmar.';
        } else {
            retomarBannerTitle.textContent = pendentes.length + ' reservas aguardando pagamento';
            retomarBannerDesc.textContent = 'Envie o comprovante de cada cota pelo WhatsApp.';
        }
        retomarBannerBtn.onclick = function () {
            abrirWhatsAppReserva(primeiro.item, primeiro.info);
        };
    }

    function exibirIdentificador(id) {
        return id ? '<span class="id-badge">' + id + '</span>' : '—';
    }

    function statusClass(status) {
        switch (status) {
            case 'LIVRE': return 'row-livre';
            case 'RESERVADA': return 'row-reservada';
            case 'VENDIDA': return 'row-vendida';
            default: return '';
        }
    }

    function badgeClass(status) {
        switch (status) {
            case 'LIVRE': return 'badge-livre';
            case 'RESERVADA': return 'badge-reservada';
            case 'VENDIDA': return 'badge-vendida';
            default: return '';
        }
    }

    function paymentHtml(pagamento, status) {
        if (!pagamento || status === 'LIVRE') {
            return '<span class="payment payment--empty">—</span>';
        }
        if (pagamento === 'PAGO') {
            return '<span class="payment payment--pago">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
                '<polyline points="20 6 9 17 4 12"/></svg>PAGO</span>';
        }
        if (pagamento === 'PENDENTE') {
            return '<span class="payment payment--pendente">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>PENDENTE</span>';
        }
        return '<span class="payment payment--empty">' + pagamento + '</span>';
    }

    function actionHtml(item) {
        if (item.status === 'LIVRE') {
            return '<button type="button" class="btn-reservar-linha" data-cota="' + item.cota + '">Reservar</button>';
        }
        if (isMinhaReserva(item.cota)) {
            if (reservaAguardaPagamento(item)) {
                return '<span class="tag-minha">Sua reserva</span> ' +
                    '<button type="button" class="btn-pagar-wa" data-cota="' + item.cota + '">Pagar WhatsApp</button>';
            }
            if (item.status === 'VENDIDA' && item.pagamento === 'PAGO') {
                return '<span class="tag-minha">Confirmada ✓</span>';
            }
        }
        return '<span class="acao-bloqueada" title="Cota indisponível">—</span>';
    }

    function updateStats(data) {
        var total = data.length;
        var vendidas = data.filter(function (d) { return d.status === 'VENDIDA'; }).length;
        var reservadas = data.filter(function (d) { return d.status === 'RESERVADA'; }).length;
        var livres = data.filter(function (d) { return d.status === 'LIVRE'; }).length;
        var pct = total > 0 ? Math.round((vendidas / total) * 100) : 0;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-vendidas').textContent = vendidas;
        document.getElementById('stat-reservadas').textContent = reservadas;
        document.getElementById('stat-livres').textContent = livres;
        document.getElementById('progress-text').textContent = pct + '%';
        document.getElementById('progress-fill').style.width = pct + '%';
        document.getElementById('progress-bar').setAttribute('aria-valuenow', pct);
    }

    function getFilteredData() {
        var query = searchInput.value.trim().toLowerCase();
        var status = filterStatus.value;

        var filtered = allData.filter(function (item) {
            if (status !== 'TODOS' && item.status !== status) return false;
            if (!query) return true;
            return (
                item.cota.toLowerCase().includes(query) ||
                item.numero1.toLowerCase().includes(query) ||
                item.numero2.toLowerCase().includes(query) ||
                item.numero3.toLowerCase().includes(query) ||
                (item.identificador || '').toLowerCase().includes(query) ||
                item.status.toLowerCase().includes(query)
            );
        });

        filtered.sort(function (a, b) {
            var cmp = a.cota.localeCompare(b.cota, undefined, { numeric: true });
            return sortAsc ? cmp : -cmp;
        });

        return filtered;
    }

    function updateCotaSelect() {
        var livres = allData.filter(function (d) { return d.status === 'LIVRE'; });
        var current = reservaCota.value;
        reservaCota.innerHTML = '<option value="">Selecione uma cota livre…</option>';
        livres.forEach(function (item) {
            var opt = document.createElement('option');
            opt.value = item.cota;
            opt.textContent = 'Cota ' + item.cota + ' (' + item.numero1 + ' · ' + item.numero2 + ' · ' + item.numero3 + ')';
            reservaCota.appendChild(opt);
        });
        if (current && livres.some(function (d) { return d.cota === current; })) {
            reservaCota.value = current;
        }
    }

    function formatCotaRange(de, ate) {
        return de + ' a ' + ate;
    }

    function updateRangeSelect(data, pageInfo) {
        if (!rangeSelect) return;

        var totalPages = pageInfo.totalPages;
        if (pageInfo.total === 0) {
            rangeSelect.innerHTML = '';
            rangeSelect.disabled = true;
            return;
        }

        var html = '';
        for (var p = 1; p <= totalPages; p++) {
            var start = (p - 1) * pageSize;
            var end = Math.min(start + pageSize, data.length) - 1;
            var de = data[start].cota;
            var ate = data[end].cota;
            html += '<option value="' + p + '">' + formatCotaRange(de, ate) + '</option>';
        }

        rangeSelect.innerHTML = html;
        rangeSelect.value = String(currentPage);
        rangeSelect.disabled = totalPages <= 1;
    }

    function getPageSlice(data) {
        var total = data.length;
        var totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        var startIndex = (currentPage - 1) * pageSize;
        var endIndex = Math.min(startIndex + pageSize, total);
        return {
            items: data.slice(startIndex, endIndex),
            total: total,
            totalPages: totalPages,
            from: total === 0 ? 0 : startIndex + 1,
            to: endIndex
        };
    }

    function updatePaginationUI(data, pageInfo) {
        if (!paginacao) return;

        updateRangeSelect(data, pageInfo);

        if (pageInfo.total === 0) {
            paginacao.hidden = true;
            return;
        }

        paginacao.hidden = pageInfo.totalPages <= 1;
        if (pagInfo) {
            var startIndex = (currentPage - 1) * pageSize;
            var endIndex = Math.min(startIndex + pageSize, data.length) - 1;
            pagInfo.textContent = formatCotaRange(data[startIndex].cota, data[endIndex].cota);
        }
        if (pagPrev) pagPrev.disabled = currentPage <= 1;
        if (pagNext) pagNext.disabled = currentPage >= pageInfo.totalPages;
    }

    function scrollToLista() {
        var wrapper = document.querySelector('.table-wrapper');
        if (wrapper) {
            wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (cotasMobile) cotasMobile.scrollTop = 0;
        var tableScroll = document.querySelector('.table-wrapper .table-scroll');
        if (tableScroll) tableScroll.scrollTop = 0;
    }

    function goToPage(page) {
        currentPage = page;
        renderTable(false);
        scrollToLista();
    }

    function resetPageAndRender() {
        currentPage = 1;
        renderTable(false);
    }

    function bindRowActions(root) {
        if (!root) return;
        root.querySelectorAll('.btn-reservar-linha').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openModal(btn.getAttribute('data-cota'));
            });
        });
        root.querySelectorAll('.btn-pagar-wa').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var cota = btn.getAttribute('data-cota');
                var item = allData.find(function (d) { return d.cota === cota; });
                var info = getMinhasReservasMap()[cota];
                if (item && info) {
                    abrirWhatsAppReserva(item, info);
                }
            });
        });
    }

    function renderMobileCards(data) {
        if (!cotasMobile) return;

        if (data.length === 0) {
            cotasMobile.innerHTML = '<p class="mobile-empty">Nenhuma cota encontrada.</p>';
            return;
        }

        var html = '';
        data.forEach(function (item) {
            html += '<article class="cota-card ' + statusClass(item.status) + '">' +
                '<div class="cota-card__top">' +
                    '<strong class="cota-card__cota">Cota ' + item.cota + '</strong>' +
                    '<span class="badge ' + badgeClass(item.status) + '">' + item.status + '</span>' +
                '</div>' +
                '<p class="cota-card__numeros">' +
                    '<span class="cota-card__label">Números</span> ' +
                    item.numero1 + ' · ' + item.numero2 + ' · ' + item.numero3 +
                '</p>' +
                '<div class="cota-card__row">' +
                    '<span class="cota-card__label">ID</span> ' +
                    exibirIdentificador(item.identificador) +
                '</div>' +
                '<div class="cota-card__row">' +
                    '<span class="cota-card__label">Pagamento</span> ' +
                    paymentHtml(item.pagamento, item.status) +
                '</div>' +
                '<div class="cota-card__acao">' + actionHtml(item) + '</div>' +
                '</article>';
        });

        cotasMobile.innerHTML = html;
        bindRowActions(cotasMobile);
    }

    function renderTable(keepPage) {
        var data = getFilteredData();
        var pageInfo = getPageSlice(data);
        var pageData = pageInfo.items;

        updateStats(allData);
        updateCotaSelect();
        updatePaginationUI(data, pageInfo);

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Nenhuma cota encontrada.</td></tr>';
            renderMobileCards([]);
            document.getElementById('table-footer').textContent = '0 cotas exibidas';
            atualizarBannerRetomar();
            return;
        }

        var html = '';
        pageData.forEach(function (item) {
            html += '<tr class="' + statusClass(item.status) + '">' +
                '<td class="num">' + item.cota + '</td>' +
                '<td class="num">' + item.numero1 + '</td>' +
                '<td class="num">' + item.numero2 + '</td>' +
                '<td class="num">' + item.numero3 + '</td>' +
                '<td class="comprador">' + exibirIdentificador(item.identificador) + '</td>' +
                '<td><span class="badge ' + badgeClass(item.status) + '">' + item.status + '</span></td>' +
                '<td>' + paymentHtml(item.pagamento, item.status) + '</td>' +
                '<td class="col-acao">' + actionHtml(item) + '</td>' +
                '</tr>';
        });

        tbody.innerHTML = html;
        renderMobileCards(pageData);
        document.getElementById('table-footer').textContent =
            pageData.length + ' nesta página · ' + pageInfo.total + ' no filtro · ' + allData.length + ' total';

        atualizarBannerRetomar();
        bindRowActions(tbody);
    }

    function openRetomarModal(idPre) {
        retomarError.hidden = true;
        retomarError.textContent = '';
        retomarId.value = idPre ? normalizarIdentificador(idPre) : '';
        modalRetomar.hidden = false;
        document.body.classList.add('modal-open');
        retomarId.focus();
    }

    function closeRetomarModal() {
        modalRetomar.hidden = true;
        if (modalOverlay.hidden && modalSucesso.hidden) {
            document.body.classList.remove('modal-open');
        }
        formRetomar.reset();
        retomarError.hidden = true;
    }

    function showRetomarError(msg) {
        retomarError.textContent = msg;
        retomarError.hidden = false;
    }

    function submitRetomar(e) {
        e.preventDefault();
        retomarError.hidden = true;
        var result = retomarPagamento(retomarId.value);
        if (!result.ok) {
            showRetomarError(result.erro);
            return;
        }
        closeRetomarModal();
    }

    function loadCotas(silent) {
        return RifaAPI.fetchCotasPublic()
            .then(function (data) {
                allData = data;
                limparReservasAntigas(data);
                renderTable(true);
            })
            .catch(function (err) {
                if (!silent) {
                    var msg = (err && err.message) ? err.message : 'Erro ao carregar cotas.';
                    if (msg.indexOf('config.js') !== -1) {
                        msg = 'Configure js/config.js com os dados do Supabase.';
                    }
                    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">' + msg + '</td></tr>';
                }
            });
    }

    function openModal(cotaPre) {
        formError.hidden = true;
        formError.textContent = '';
        updateCotaSelect();
        if (cotaPre) reservaCota.value = cotaPre;
        modalOverlay.hidden = false;
        document.body.classList.add('modal-open');
        reservaNome.focus();
    }

    function closeModal() {
        modalOverlay.hidden = true;
        if (modalSucesso.hidden) {
            document.body.classList.remove('modal-open');
        }
        formReserva.reset();
        formError.hidden = true;
    }

    function openSucessoModal(cotaData, nome, identificador) {
        sucessoMsg.textContent = 'Cota ' + cotaData.cota + ' reservada! Envie o pagamento pelo WhatsApp para o organizador confirmar.';
        sucessoIdCode.textContent = identificador;
        sucessoId.hidden = false;
        btnWhatsappPagar.href = buildWhatsAppUrl(cotaData, nome, identificador);
        modalSucesso.hidden = false;
        document.body.classList.add('modal-open');
    }

    function closeSucessoModal() {
        modalSucesso.hidden = true;
        sucessoId.hidden = true;
        document.body.classList.remove('modal-open');
    }

    function showFormError(msg) {
        formError.textContent = msg;
        formError.hidden = false;
    }

    function submitReserva(e) {
        e.preventDefault();
        formError.hidden = true;

        var cota = reservaCota.value;
        var nome = reservaNome.value.trim();
        var whatsapp = reservaWhatsapp.value.trim();

        if (!cota) {
            showFormError('Selecione uma cota livre.');
            return;
        }
        if (nome.length < 3) {
            showFormError('Informe seu nome completo.');
            return;
        }
        if (whatsapp.replace(/\D/g, '').length < 10) {
            showFormError('Informe seu WhatsApp com DDD.');
            return;
        }

        btnConfirmar.disabled = true;
        btnConfirmar.textContent = 'Reservando…';

        RifaAPI.reservar(cota, nome, whatsapp)
            .then(function (result) {
                if (!result.ok) {
                    showFormError(result.erro || 'Não foi possível reservar.');
                    return;
                }
                salvarMinhaReserva(result.body.cota.cota, nome, result.body.cota.identificador);
                closeModal();
                return loadCotas(true).then(function () {
                    openSucessoModal(result.body.cota, nome, result.body.cota.identificador);
                });
            })
            .catch(function () {
                showFormError('Erro de conexão. Tente novamente.');
            })
            .finally(function () {
                btnConfirmar.disabled = false;
                btnConfirmar.textContent = 'Confirmar reserva';
            });
    }

    function initTheme() {
        if (localStorage.getItem('rifa-theme') === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    function toggleTheme() {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('rifa-theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('rifa-theme', 'dark');
        }
    }

    function initWhatsApp() {
        if (!whatsappBtn) return;
        whatsappBtn.href = window.RifaPublic
            ? RifaPublic.whatsappUrl('Olá! Gostaria de reservar uma cota da rifa.', rifaConfig)
            : 'https://wa.me/' + String(rifaConfig.whatsapp || '').replace(/\D/g, '') +
                '?text=' + encodeURIComponent('Olá! Gostaria de reservar uma cota da rifa.');
    }

    function updateModalPix() {
        if (!modalPixBox || !modalPixValue) return;
        var Pix = window.RifaPixConfig;
        if (Pix && !Pix.shouldShow(rifaConfig)) {
            modalPixBox.hidden = true;
            return;
        }
        var tipo = Pix.effectiveTipo(rifaConfig);
        var key = rifaConfig.chave_pix;
        if (modalPixLabel && Pix) {
            modalPixLabel.textContent = 'Chave PIX · ' + Pix.labelTipo(tipo);
        }
        modalPixValue.textContent = Pix.formatDisplay(tipo, key);
        modalPixBox.hidden = false;
    }

    function copyPixKey() {
        var key = String(rifaConfig.chave_pix || '').trim();
        if (!key) return;
        function onCopied() {
            if (!btnCopyPix) return;
            var prev = btnCopyPix.title;
            btnCopyPix.title = 'Copiado!';
            setTimeout(function () { btnCopyPix.title = prev || 'Copiar chave PIX'; }, 2000);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(key).then(onCopied).catch(function () {
                window.prompt('Copie a chave PIX:', key);
            });
        } else {
            window.prompt('Copie a chave PIX:', key);
        }
    }

    function applyRifaConfig(cfg) {
        rifaConfig = cfg || rifaConfig;
        if (window.RifaPublic) RifaPublic.apply(rifaConfig);
        initWhatsApp();
        updateModalPix();
    }

    function loadRifaConfig() {
        if (!window.RifaPublic) {
            initWhatsApp();
            return Promise.resolve(rifaConfig);
        }
        return RifaPublic.load().then(function (cfg) {
            applyRifaConfig(cfg);
            return cfg;
        });
    }

    searchInput.addEventListener('input', resetPageAndRender);
    filterStatus.addEventListener('change', resetPageAndRender);
    btnSort.addEventListener('click', function () {
        sortAsc = !sortAsc;
        sortLabel.textContent = sortAsc ? 'Cota ↑' : 'Cota ↓';
        resetPageAndRender();
    });
    if (rangeSelect) {
        rangeSelect.addEventListener('change', function () {
            goToPage(parseInt(rangeSelect.value, 10) || 1);
        });
    }
    if (pagPrev) {
        pagPrev.addEventListener('click', function () {
            if (currentPage > 1) goToPage(currentPage - 1);
        });
    }
    if (pagNext) {
        pagNext.addEventListener('click', function () {
            var data = getFilteredData();
            var totalPages = Math.max(1, Math.ceil(data.length / pageSize));
            if (currentPage < totalPages) goToPage(currentPage + 1);
        });
    }
    btnTheme.addEventListener('click', toggleTheme);
    if (btnCopyPix) btnCopyPix.addEventListener('click', copyPixKey);
    btnReservar.addEventListener('click', function () { openModal(); });
    btnRetomar.addEventListener('click', function () { openRetomarModal(); });
    retomarClose.addEventListener('click', closeRetomarModal);
    retomarCancel.addEventListener('click', closeRetomarModal);
    modalRetomar.addEventListener('click', function (e) {
        if (e.target === modalRetomar) closeRetomarModal();
    });
    formRetomar.addEventListener('submit', submitRetomar);
    retomarId.addEventListener('input', function () {
        retomarId.value = normalizarIdentificador(retomarId.value);
    });
    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) closeModal();
    });
    btnSucessoFechar.addEventListener('click', closeSucessoModal);
    modalSucesso.addEventListener('click', function (e) {
        if (e.target === modalSucesso) closeSucessoModal();
    });
    formReserva.addEventListener('submit', submitReserva);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            var modalHelp = document.getElementById('modal-help');
            if (modalHelp && !modalHelp.hidden) return;
            if (!modalOverlay.hidden) closeModal();
            if (!modalRetomar.hidden) closeRetomarModal();
            if (!modalSucesso.hidden) closeSucessoModal();
        }
    });

    initTheme();
    loadRifaConfig().finally(function () {
        loadCotas();
        refreshTimer = setInterval(function () { loadCotas(true); }, REFRESH_MS);
    });
})();
