(function () {
    var script = document.currentScript;
    var mode = (script && script.getAttribute('data-faq')) || 'comprador';

    var FAQ = {
        comprador: {
            title: 'Ajuda · Consulta de cotas',
            intro: 'Dúvidas frequentes sobre reserva, pagamento e consulta das cotas.',
            items: [
                {
                    q: 'Como reservo uma cota?',
                    a: 'Clique em <strong>Reservar cota</strong> no topo ou no botão <strong>Reservar</strong> na linha de uma cota livre. No modal você vê a <strong>chave PIX</strong> (se configurada) para copiar, depois preenche nome e WhatsApp. A cota fica <strong>Reservada</strong> até o organizador confirmar o pagamento.'
                },
                {
                    q: 'Já reservei. Como envio o pagamento?',
                    a: 'Use <strong>Retomar pagamento</strong> e informe seu código <strong>RF-XXXXXX</strong>, ou clique em <strong>Pagar WhatsApp</strong> na linha da cota. Você será direcionado ao WhatsApp do organizador com os dados da reserva.'
                },
                {
                    q: 'O que é o identificador RF-XXXXXX?',
                    a: 'É o código único da sua reserva, exibido após confirmar. Guarde-o: se fechar a página, use <strong>Retomar pagamento</strong> com esse código para abrir o WhatsApp de pagamento de novo.'
                },
                {
                    q: 'O que significam Livre, Reservada e Vendida?',
                    a: '<strong>Livre</strong> — disponível para reserva. <strong>Reservada</strong> — alguém reservou; aguarda confirmação do PIX. <strong>Vendida</strong> — pagamento confirmado pelo organizador.'
                },
                {
                    q: 'Por que minha cota ainda aparece Reservada?',
                    a: 'Após enviar o comprovante no WhatsApp, o organizador precisa confirmar no painel admin. Quando confirmar, o status muda para <strong>Vendida</strong>.'
                },
                {
                    q: 'Como falo com o organizador?',
                    a: 'Use o botão verde do WhatsApp (canto da tela ou após reservar). O número é o configurado pela equipe da rifa.'
                }
            ]
        },
        admin: {
            title: 'Ajuda · Painel admin',
            intro: 'Orientações para gerenciar cotas, pagamentos e configurações da rifa.',
            items: [
                {
                    q: 'Como confirmo que recebi o PIX?',
                    a: 'Na linha da cota <strong>Reservada</strong> com pagamento pendente, clique em <strong>✓ Pago</strong> ou edite a cota e marque pagamento <strong>PAGO</strong> e status <strong>VENDIDA</strong>.'
                },
                {
                    q: 'Liberar uma cota x Liberar todas',
                    a: '<strong>Liberar</strong> (por linha) devolve uma cota ao estado livre, removendo comprador e reserva. <strong>Liberar todas</strong> zera as 300 cotas — use só para recomeçar a rifa; exige digitar LIBERAR.'
                },
                {
                    q: 'Como usar ações em massa?',
                    a: 'Marque as cotas na coluna de seleção, escolha o status ou pagamento no bloco em massa e clique em <strong>Aplicar</strong>.'
                },
                {
                    q: 'Configurações da rifa',
                    a: 'Em <strong>Configurações</strong> altere WhatsApp, <strong>chave PIX</strong> (tipo: telefone, e-mail, CPF ou aleatória), prêmio, valor e data do sorteio. Clique em <strong>Salvar configurações</strong>.'
                },
                {
                    q: 'Como adicionar outro administrador?',
                    a: 'No Supabase, crie um novo usuário em <strong>Authentication → Users</strong> e confirme o e-mail. Não é necessário alterar código do site.'
                },
                {
                    q: 'Ver área do comprador',
                    a: 'O link no topo abre a página pública de consulta — mesma visão que o participante da rifa.'
                }
            ]
        }
    };

    var data = FAQ[mode] || FAQ.comprador;
    var modal = null;

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function buildFaqHtml() {
        var html = '';
        data.items.forEach(function (item, i) {
            html += '<details class="faq-item"' + (i === 0 ? ' open' : '') + '>' +
                '<summary>' + escapeHtml(item.q) + '</summary>' +
                '<div class="faq-item__body"><p>' + item.a + '</p></div></details>';
        });
        return html;
    }

    function ensureModal() {
        if (modal) return modal;
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'modal-help';
        overlay.hidden = true;
        overlay.innerHTML =
            '<div class="modal modal--faq" role="dialog" aria-labelledby="help-title" aria-modal="true">' +
                '<div class="modal__header">' +
                    '<h2 id="help-title">' + escapeHtml(data.title) + '</h2>' +
                    '<button type="button" class="btn btn--icon modal__close" id="help-close" aria-label="Fechar ajuda">&times;</button>' +
                '</div>' +
                '<div class="modal__body">' +
                    '<p class="faq-intro">' + escapeHtml(data.intro) + '</p>' +
                    '<div class="faq-list">' + buildFaqHtml() + '</div>' +
                '</div>' +
                '<div class="modal__actions">' +
                    '<button type="button" class="btn btn--secondary" id="help-ok">Entendi</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        modal = overlay;

        overlay.querySelector('#help-close').addEventListener('click', closeHelp);
        overlay.querySelector('#help-ok').addEventListener('click', closeHelp);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeHelp();
        });
        return modal;
    }

    function isOtherModalOpen() {
        var overlays = document.querySelectorAll('.modal-overlay:not(#modal-help)');
        for (var i = 0; i < overlays.length; i++) {
            if (!overlays[i].hidden) return true;
        }
        return false;
    }

    function openHelp() {
        ensureModal();
        modal.hidden = false;
        document.body.classList.add('modal-open');
        var first = modal.querySelector('.faq-item summary');
        if (first) first.focus();
    }

    function closeHelp() {
        if (!modal) return;
        modal.hidden = true;
        if (!isOtherModalOpen()) {
            document.body.classList.remove('modal-open');
        }
    }

    function bindTriggers() {
        document.querySelectorAll('[data-help-trigger]').forEach(function (btn) {
            btn.addEventListener('click', openHelp);
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || !modal || modal.hidden) return;
        closeHelp();
        e.stopImmediatePropagation();
    }, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindTriggers);
    } else {
        bindTriggers();
    }
})();
