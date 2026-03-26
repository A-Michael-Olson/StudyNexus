import { supabase } from "./supabase.js";

let strokesChannel = null;
let currentUserId = null;
let resizeHandler = null;



export async function initWhiteboard(channelId) {

    const canvas = document.getElementById('board');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colorInput = document.getElementById('color');
    const sizeInput = document.getElementById('size');

    // Get user once (DON’T do this every mouse move)
    const { data: { user } } = await supabase.auth.getUser();
    currentUserId = user?.id;

    // ================= CANVAS =================
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        loadHistory(); // redraw after resize
    }

    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
    }

    resizeHandler = resizeCanvas;
    resizeCanvas();
    window.addEventListener('resize', resizeHandler);

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    function startDraw(e) {
        drawing = true;
        const pos = getMousePos(e);
        lastX = pos.x;
        lastY = pos.y;
    }

    function drawLocalLine(x1, y1, x2, y2, color, size) {
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // throttle to avoid DB spam
    let lastSent = 0;

    async function drawMove(e) {
        if (!drawing) return;

        const now = Date.now();
        if (now - lastSent < 25) return;
        lastSent = now;

        const pos = getMousePos(e);
        const x = pos.x;
        const y = pos.y;
        const color = colorInput.value;
        const size = parseInt(sizeInput.value, 10);

        drawLocalLine(lastX, lastY, x, y, color, size);

        const { error } = await supabase.from('strokes').insert({
            channel_id: channelId,
            user_id: currentUserId,
            x1: lastX,
            y1: lastY,
            x2: x,
            y2: y,
            color,
            size,
        });
        if (error) console.error("Stroke insert failed:", error);

        lastX = x;
        lastY = y;
    }

    function endDraw() {
        drawing = false;
    }

    canvas.onmousedown = startDraw;
    canvas.onmousemove = drawMove;
    canvas.onmouseup = endDraw;
    canvas.onmouseleave = endDraw;

    // ================= REALTIME =================

    // clean up old subscription (VERY important)
    if (strokesChannel) {
        supabase.removeChannel(strokesChannel);
    }

    strokesChannel = supabase
        .channel('strokes-' + channelId)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'strokes',
                filter: `channel_id=eq.${channelId}`
            },
            (payload) => {
                const s = payload.new;

                // prevent double draw
                if (s.user_id === currentUserId) return;

                drawLocalLine(s.x1, s.y1, s.x2, s.y2, s.color, s.size);
            }
        )
        .subscribe();

    // ================= HISTORY =================

    async function loadHistory() {
        const { data, error } = await supabase
            .from('strokes')
            .select('*')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error(error);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        data.forEach((s) => {
            drawLocalLine(s.x1, s.y1, s.x2, s.y2, s.color, s.size);
        });
    }

    await loadHistory();
}