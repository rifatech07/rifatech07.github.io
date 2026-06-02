(function () {
    'use strict';

    (function limparAcessoNovo() {
        var params = new URLSearchParams(window.location.search);
        if (params.get('novo') === '1' || params.get('limpar') === '1') {
            RifaAPI.adminLogout().catch(function () {});
            params.delete('novo');
            params.delete('limpar');
            var qs = params.toString();
            window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : ''));
        }
    })();

    let allData = [];
    let selected = new Set();
    let toastTimer = null;

    const loginScreen = document.getElementById('login-screen');
    const adminApp = document.getElementById('admin-app');
    const formLogin = document.getElementById('form-login');
    const loginEmail = document.getElementById('login-email');
    const loginSenha = document.getElementById('login-senha');
    const loginError = document.getElementById('login-error');
    const btnLogout = document.getElementById('btn-logout');
    const btnTheme = document.getElementById('btn-theme');
    const tbody = document.getElementById('tbody');
    const adminCotasMobile = document.getElementById('admin-cotas-mobile');
    const searchInput = document.getElementById('search');
    const filterStatus = document.getElementById('filter-status');
    const filterPagamento = document.getElementById('filter-pagamento');
    const btnNova = document.getElementById('btn-nova');
    const btnRefresh = document.getElementById('btn-refresh');
    const btnResetAll = document.getElementById('btn-reset-all');
    const bulkBar = document.getElementById('bulk-bar');
    const bulkCount = document.getElementById('bulk-count');
    const bulkStatus = document.getElementById('bulk-status');
    const btnBulkApply = document.getElementById('btn-bulk-apply');
    const btnBulkClear = document.getElementById('btn-bulk-clear');
    const checkAll = document.getElementById('check-all');
    const toast = document.getElementById('toast');

    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const formCota = document.getElementById('form-cota');
    const editMode = document.getElementById('edit-mode');
    const fCota = document.getElementById('f-cota');
    const fNumero1 = document.getElementById('f-numero1');
    const fNumero2 = document.getElementById('f-numero2');
    const fNumero3 = document.getElementById('f-numero3');
    const fComprador = document.getElementById('f-comprador');
    const fStatus = document.getElementById('f-status');
    const fPagamento = document.getElementById('f-pagamento');
    const formError = document.getElementById('form-error');
    const modalTitle = document.getElementById('modal-title');

    const modalReset = document.getElementById('modal-reset');
    const resetConfirmInput = document.getElementById('reset-confirm');
    const resetConfirmBtn = document.getElementById('reset-confirm-btn');
    const resetCancel = document.getElementById('reset-cancel');

    function gerarIdentificadorLocal() {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var id = 'RF-';
        for (var i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    function buildCotaPayload(form) {
        var status = form.status;
        var payload = {
            numero1: form.numero1,
            numero2: form.numero2,
            numero3: form.numero3,
            status: status,
            pagamento: form.pagamento || '',
            comprador: form.comprador || '',
            whatsapp: ''
        };
        if (status === 'LIVRE') {
            payload.comprador = '';
            payload.identificador = '';
            payload.pagamento = '';
            payload.whatsapp = '';
            payload.reservado_em = null;
        } else {
            payload.pagamento = payload.pagamento || 'PENDENTE';
            payload.identificador = form.identificador || gerarIdentificadorLocal();
            if (!form.reservado_em) {
                payload.reservado_em = new Date().toISOString();
            }
        }
        return payload;
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.hidden = true; }, 3200);
    }

    function formatDate(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso.replace(' ', 'T')).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return iso;
        }
    }

    function formatWhatsApp(num) {
        var d = String(num).replace(/\D/g, '');
        if (d.length === 13) return '+' + d.slice(0, 2) + ' (' + d.slice(2, 4) + ') ' + d.slice(4);
        if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
        return d;
    }

    function confirmarPagamento(cota) {
        if (!confirm('Confirmar que recebeu o PIX da cota ' + cota + '?\n\nA cota será marcada como VENDIDA / PAGO.')) return;

        RifaAPI.confirmarPagamento(cota).then(function (result) {
            if (!result.ok) {
                alert(result.erro || 'Erro ao confirmar.');
                return;
            }
            showToast('Cota ' + cota + ' confirmada como paga!');
            loadData();
        });
    }

    function statusClass(status) {
        if (status === 'LIVRE') return 'row-livre';
        if (status === 'RESERVADA') return 'row-reservada';
        if (status === 'VENDIDA') return 'row-vendida';
        return '';
    }

    function badgeClass(status) {
        if (status === 'LIVRE') return 'badge-livre';
        if (status === 'RESERVADA') return 'badge-reservada';
        if (status === 'VENDIDA') return 'badge-vendida';
        return '';
    }

    function updateStatsFromData(data) {
        var vendidas = data.filter(function (d) { return d.status === 'VENDIDA'; }).length;
        var reservadas = data.filter(function (d) { return d.status === 'RESERVADA'; }).length;
        var livres = data.filter(function (d) { return d.status === 'LIVRE'; }).length;
        var pagas = data.filter(function (d) { return d.pagamento === 'PAGO'; }).length;
        var pendentes = data.filter(function (d) { return d.pagamento === 'PENDENTE'; }).length;
        var pct = data.length > 0 ? Math.round((vendidas / data.length) * 100) : 0;

        document.getElementById('stat-total').textContent = data.length;
        document.getElementById('stat-vendidas').textContent = vendidas;
        document.getElementById('stat-reservadas').textContent = reservadas;
        document.getElementById('stat-livres').textContent = livres;
        document.getElementById('stat-pagas').textContent = pagas;
        document.getElementById('stat-pendentes').textContent = pendentes;
        document.getElementById('progress-text').textContent = pct + '%';
        document.getElementById('progress-fill').style.width = pct + '%';
    }

    function getFiltered() {
        var q = searchInput.value.trim().toLowerCase();
        var st = filterStatus.value;
        var pg = filterPagamento.value;

        return allData.filter(function (item) {
            if (st !== 'TODOS' && item.status !== st) return false;
            if (pg === 'PAGO' && item.pagamento !== 'PAGO') return false;
            if (pg === 'PENDENTE' && item.pagamento !== 'PENDENTE') return false;
            if (pg === 'VAZIO' && item.pagamento) return false;
            if (!q) return true;
            return (
                item.cota.includes(q) ||
                item.numero1.includes(q) ||
                item.numero2.includes(q) ||
                item.numero3.includes(q) ||
                (item.comprador || '').toLowerCase().includes(q) ||
                (item.identificador || '').toLowerCase().includes(q) ||
                item.status.toLowerCase().includes(q)
            );
        });
    }

    function updateBulkBar() {
        if (selected.size > 0) {
            bulkBar.hidden = false;
            bulkCount.textContent = selected.size + ' selecionada' + (selected.size > 1 ? 's' : '');
        } else {
            bulkBar.hidden = true;
        }
        checkAll.checked = selected.size > 0 && getFiltered().every(function (d) {
            return selected.has(d.cota);
        });
    }

    function bindAdminRowActions(root) {
        if (!root) return;

        root.querySelectorAll('.row-check').forEach(function (cb) {
            cb.addEventListener('change', function () {
                var c = cb.getAttribute('data-cota');
                if (cb.checked) selected.add(c);
                else selected.delete(c);
                updateBulkBar();
            });
        });

        root.querySelectorAll('.btn-edit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openEdit(btn.getAttribute('data-cota'));
            });
        });

        root.querySelectorAll('.btn-del').forEach(function (btn) {
            btn.addEventListener('click', function () {
                deleteCota(btn.getAttribute('data-cota'));
            });
        });

        root.querySelectorAll('.btn-confirm').forEach(function (btn) {
            btn.addEventListener('click', function () {
                confirmarPagamento(btn.getAttribute('data-cota'));
            });
        });
    }

    function buildAdminRowCells(item) {
        var checked = selected.has(item.cota) ? ' checked' : '';
        var wa = item.whatsapp ? formatWhatsApp(item.whatsapp) : '—';
        var waLink = item.whatsapp
            ? '<a href="https://wa.me/' + item.whatsapp + '" target="_blank" rel="noopener" class="wa-link">' + wa + '</a>'
            : '—';
        var confirmBtn = (item.pagamento === 'PENDENTE' && item.status !== 'LIVRE')
            ? '<button type="button" class="btn-icon-action btn-confirm" data-cota="' + item.cota + '" title="Confirmar PIX recebido">✓ Pago</button>'
            : '';
        var pagamentoClass = 'pagamento-cell' +
            (item.pagamento === 'PAGO' ? ' pagamento-cell--pago' : '') +
            (item.pagamento === 'PENDENTE' ? ' pagamento-cell--pendente' : '');

        return {
            checked: checked,
            waLink: waLink,
            confirmBtn: confirmBtn,
            pagamentoClass: pagamentoClass
        };
    }

    function renderAdminMobileCards(data) {
        if (!adminCotasMobile) return;

        if (data.length === 0) {
            adminCotasMobile.innerHTML = '<p class="admin-mobile-empty">Nenhuma cota encontrada.</p>';
            return;
        }

        var html = '';
        data.forEach(function (item) {
            var cells = buildAdminRowCells(item);
            html += '<article class="admin-cota-card cota-card ' + statusClass(item.status) + '">' +
                '<div class="admin-cota-card__head">' +
                    '<label class="admin-cota-card__check">' +
                        '<input type="checkbox" class="row-check" data-cota="' + item.cota + '"' + cells.checked + '>' +
                        '<strong>Cota ' + item.cota + '</strong>' +
                    '</label>' +
                    '<span class="badge ' + badgeClass(item.status) + '">' + item.status + '</span>' +
                '</div>' +
                '<p class="cota-card__numeros">' +
                    '<span class="cota-card__label">Números</span> ' +
                    item.numero1 + ' · ' + item.numero2 + ' · ' + item.numero3 +
                '</p>';

            if (item.comprador) {
                html += '<div class="cota-card__row">' +
                    '<span class="cota-card__label">Comprador</span> ' +
                    '<span class="admin-cota-card__nome">' + item.comprador + '</span>' +
                '</div>';
            }

            html += '<div class="cota-card__row">' +
                    '<span class="cota-card__label">ID</span> ' +
                    '<span class="id-badge">' + (item.identificador || '—') + '</span>' +
                '</div>' +
                '<div class="cota-card__row">' +
                    '<span class="cota-card__label">WhatsApp</span> ' + cells.waLink +
                '</div>' +
                '<div class="cota-card__row">' +
                    '<span class="cota-card__label">Pagamento</span> ' +
                    '<span class="' + cells.pagamentoClass + '">' + (item.pagamento || '—') + '</span>' +
                '</div>';

            if (item.reservado_em) {
                html += '<div class="cota-card__row admin-cota-card__data">' +
                    '<span class="cota-card__label">Reservado</span> ' +
                    formatDate(item.reservado_em) +
                '</div>';
            }

            html += '<div class="admin-cota-card__acao">' +
                    cells.confirmBtn +
                    '<button type="button" class="btn-icon-action btn-edit" data-cota="' + item.cota + '">Editar</button>' +
                    '<button type="button" class="btn-icon-action btn-icon-action--del btn-del" data-cota="' + item.cota + '">Liberar</button>' +
                '</div>' +
                '</article>';
        });

        adminCotasMobile.innerHTML = html;
        bindAdminRowActions(adminCotasMobile);
    }

    function renderTable() {
        var data = getFiltered();
        updateStatsFromData(allData);
        updateBulkBar();

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" class="empty-row">Nenhuma cota encontrada.</td></tr>';
            renderAdminMobileCards([]);
            document.getElementById('table-footer').textContent = '0 cotas';
            return;
        }

        var html = '';
        data.forEach(function (item) {
            var cells = buildAdminRowCells(item);

            html += '<tr class="' + statusClass(item.status) + '">' +
                '<td class="col-check"><input type="checkbox" class="row-check" data-cota="' + item.cota + '"' + cells.checked + '></td>' +
                '<td class="num">' + item.cota + '</td>' +
                '<td class="num">' + item.numero1 + '</td>' +
                '<td class="num">' + item.numero2 + '</td>' +
                '<td class="num">' + item.numero3 + '</td>' +
                '<td class="comprador-full" title="' + (item.comprador || '') + '">' + (item.comprador || '—') + '</td>' +
                '<td class="id-cell"><span class="id-badge">' + (item.identificador || '—') + '</span></td>' +
                '<td class="wa-cell">' + cells.waLink + '</td>' +
                '<td><span class="badge ' + badgeClass(item.status) + '">' + item.status + '</span></td>' +
                '<td class="' + cells.pagamentoClass + '">' + (item.pagamento || '—') + '</td>' +
                '<td class="reservado-em">' + formatDate(item.reservado_em) + '</td>' +
                '<td class="col-acao"><div class="admin-actions">' +
                cells.confirmBtn +
                '<button type="button" class="btn-icon-action btn-edit" data-cota="' + item.cota + '">Editar</button>' +
                '<button type="button" class="btn-icon-action btn-icon-action--del btn-del" data-cota="' + item.cota + '">Liberar</button>' +
                '</div></td></tr>';
        });

        tbody.innerHTML = html;
        renderAdminMobileCards(data);
        document.getElementById('table-footer').textContent = data.length + ' de ' + allData.length + ' cotas';

        bindAdminRowActions(tbody);
    }

    function loadData() {
        return RifaAPI.fetchCotasAdmin().then(function (data) {
            allData = data;
            renderTable();
        }).catch(function (err) {
            var msg = (err && err.message) || 'Erro ao carregar';
            if (msg.indexOf('JWT') !== -1 || msg.indexOf('auth') !== -1) {
                showLogin();
            }
            throw err;
        });
    }

    function showLogin() {
        loginScreen.hidden = false;
        adminApp.hidden = true;
    }

    function showAdmin() {
        loginScreen.hidden = true;
        adminApp.hidden = false;
        loadData().catch(function (err) {
            showLogin();
            var msg = (err && err.message) || 'Erro ao carregar dados.';
            loginError.textContent = msg;
            loginError.hidden = false;
        });
    }

    function openModalCreate() {
        editMode.value = 'create';
        modalTitle.textContent = 'Nova cota';
        fCota.disabled = false;
        formCota.reset();
        fStatus.value = 'LIVRE';
        fPagamento.value = '';
        formError.hidden = true;
        modalOverlay.hidden = false;
        document.body.classList.add('modal-open');
        fCota.focus();
    }

    function openEdit(cota) {
        var item = allData.find(function (d) { return d.cota === cota; });
        if (!item) return;

        editMode.value = 'edit';
        modalTitle.textContent = 'Editar cota ' + item.cota;
        fCota.value = item.cota;
        fCota.disabled = true;
        fNumero1.value = item.numero1;
        fNumero2.value = item.numero2;
        fNumero3.value = item.numero3;
        fComprador.value = item.comprador || '';
        fStatus.value = item.status;
        fPagamento.value = item.pagamento || '';
        formError.hidden = true;
        modalOverlay.hidden = false;
        document.body.classList.add('modal-open');
    }

    function closeModal() {
        modalOverlay.hidden = true;
        formError.hidden = true;
        if (modalReset.hidden) {
            document.body.classList.remove('modal-open');
        }
    }

    function toggleCompradorRequired() {
        fComprador.required = fStatus.value !== 'LIVRE';
    }

    function saveCota(e) {
        e.preventDefault();
        formError.hidden = true;

        var form = {
            numero1: fNumero1.value.trim(),
            numero2: fNumero2.value.trim(),
            numero3: fNumero3.value.trim(),
            comprador: fComprador.value.trim(),
            status: fStatus.value,
            pagamento: fPagamento.value
        };

        if (fStatus.value !== 'LIVRE' && form.comprador.length < 3) {
            formError.textContent = 'Informe o nome do comprador.';
            formError.hidden = false;
            return;
        }

        var promise;
        if (editMode.value === 'create') {
            var createPayload = buildCotaPayload(form);
            createPayload.cota = fCota.value.trim();
            promise = RifaAPI.createCota(createPayload);
        } else {
            var item = allData.find(function (d) { return d.cota === fCota.value; });
            var updatePayload = buildCotaPayload(Object.assign({}, form, {
                identificador: item ? item.identificador : '',
                reservado_em: item ? item.reservado_em : null
            }));
            promise = RifaAPI.updateCota(fCota.value, updatePayload);
        }

        promise.then(function (result) {
            if (!result.ok) {
                formError.textContent = result.erro || 'Erro ao salvar.';
                formError.hidden = false;
                return;
            }
            closeModal();
            showToast(editMode.value === 'create' ? 'Cota criada!' : 'Cota atualizada!');
            loadData();
        }).catch(function () {
            formError.textContent = 'Erro de conexão.';
            formError.hidden = false;
        });
    }

    function deleteCota(cota) {
        if (!confirm('Liberar a cota ' + cota + '? Comprador e reserva serão removidos.')) return;

        RifaAPI.liberarCota(cota).then(function (result) {
            if (!result.ok) {
                alert(result.erro || 'Erro ao liberar.');
                return;
            }
            selected.delete(cota);
            showToast('Cota ' + cota + ' liberada.');
            loadData();
        });
    }

    function openResetModal() {
        resetConfirmInput.value = '';
        resetConfirmBtn.disabled = true;
        modalReset.hidden = false;
        document.body.classList.add('modal-open');
        resetConfirmInput.focus();
    }

    function closeResetModal() {
        modalReset.hidden = true;
        resetConfirmInput.value = '';
        resetConfirmBtn.disabled = true;
        if (modalOverlay.hidden) {
            document.body.classList.remove('modal-open');
        }
    }

    function resetAll() {
        openResetModal();
    }

    function executarResetAll() {
        if (resetConfirmInput.value.trim() !== 'LIBERAR') return;

        resetConfirmBtn.disabled = true;
        resetConfirmBtn.textContent = 'Liberando…';

        RifaAPI.resetAll().then(function (result) {
            if (!result.ok) {
                alert(result.erro || 'Erro.');
                resetConfirmBtn.disabled = false;
                resetConfirmBtn.textContent = 'Liberar todas agora';
                return;
            }
            selected.clear();
            closeResetModal();
            showToast(result.body.total + ' cotas liberadas.');
            loadData();
        }).catch(function () {
            alert('Erro de conexão.');
            resetConfirmBtn.disabled = false;
            resetConfirmBtn.textContent = 'Liberar todas agora';
        }).finally(function () {
            if (!modalReset.hidden) {
                resetConfirmBtn.textContent = 'Liberar todas agora';
            }
        });
    }

    function applyBulk() {
        if (selected.size === 0) return;
        var status = bulkStatus.value;
        var msg = 'Alterar ' + selected.size + ' cota(s) para ' + status + '?';
        if (!confirm(msg)) return;

        RifaAPI.bulkStatus(Array.from(selected), status).then(function (result) {
            if (!result.ok) {
                alert(result.erro || 'Erro.');
                return;
            }
            showToast(result.body.total + ' cotas atualizadas.');
            selected.clear();
            loadData();
        });
    }

    formLogin.addEventListener('submit', function (e) {
        e.preventDefault();
        loginError.hidden = true;

        RifaAPI.adminLogin(loginEmail.value.trim(), loginSenha.value)
            .then(function (result) {
                if (result.error) {
                    loginError.textContent = result.error.message || 'E-mail ou senha incorretos.';
                    loginError.hidden = false;
                    return;
                }
                if (!result.data || !result.data.session) {
                    loginError.textContent = 'Usuário não confirmado. No Supabase: Authentication → Users → confirme o e-mail.';
                    loginError.hidden = false;
                    return;
                }
                loginSenha.value = '';
                showAdmin();
            })
            .catch(function () {
                loginError.textContent = 'Erro de conexão. Verifique config.js e Supabase.';
                loginError.hidden = false;
            });
    });

    btnLogout.addEventListener('click', function () {
        RifaAPI.adminLogout().finally(function () {
            selected.clear();
            showLogin();
        });
    });

    btnTheme.addEventListener('click', function () {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('rifa-theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('rifa-theme', 'dark');
        }
    });

    searchInput.addEventListener('input', renderTable);
    filterStatus.addEventListener('change', renderTable);
    filterPagamento.addEventListener('change', renderTable);
    btnNova.addEventListener('click', openModalCreate);
    btnRefresh.addEventListener('click', function () { loadData().then(function () { showToast('Atualizado!'); }); });
    btnResetAll.addEventListener('click', resetAll);
    resetCancel.addEventListener('click', closeResetModal);
    modalReset.addEventListener('click', function (e) {
        if (e.target === modalReset) closeResetModal();
    });
    resetConfirmInput.addEventListener('input', function () {
        resetConfirmBtn.disabled = resetConfirmInput.value.trim() !== 'LIBERAR';
    });
    resetConfirmBtn.addEventListener('click', executarResetAll);
    resetConfirmInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !resetConfirmBtn.disabled) {
            e.preventDefault();
            executarResetAll();
        }
    });
    btnBulkApply.addEventListener('click', applyBulk);
    btnBulkClear.addEventListener('click', function () { selected.clear(); renderTable(); });
    checkAll.addEventListener('change', function () {
        var data = getFiltered();
        if (checkAll.checked) {
            data.forEach(function (d) { selected.add(d.cota); });
        } else {
            data.forEach(function (d) { selected.delete(d.cota); });
        }
        renderTable();
    });

    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) closeModal();
    });
    formCota.addEventListener('submit', saveCota);
    fStatus.addEventListener('change', toggleCompradorRequired);

    if (localStorage.getItem('rifa-theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    RifaAPI.getSession().then(function (result) {
        if (result.data && result.data.session) {
            showAdmin();
        } else {
            showLogin();
        }
    }).catch(function () {
        showLogin();
    });
})();
