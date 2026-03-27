import { supabase } from "./supabase.js";

let strokesChannel = null;
let currentUserId = null;
let resizeHandler = null;
let currentStroke = [];



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

        const clientX = e.clientX ?? e.touches?.[0]?.clientX;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    }

    function startDraw(e) {
        drawing = true;
        canvas.setPointerCapture(e.pointerId);

        const pos = getMousePos(e);
        currentStroke = [pos];

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

    function drawMove(e) {
        if (!drawing) return;

        const pos = getMousePos(e);
        const color = colorInput.value;
        const size = parseInt(sizeInput.value, 10);

        drawLocalLine(lastX, lastY, pos.x, pos.y, color, size);

        currentStroke.push(pos);

        lastX = pos.x;
        lastY = pos.y;
    }

    async function endDraw(e) {
        if (!drawing) return;

        canvas.releasePointerCapture?.(e.pointerId);
        drawing = false;

        if (currentStroke.length < 2) return;

        const { error } = await supabase.from('strokes').insert({
            channel_id: channelId,
            user_id: currentUserId,
            points: currentStroke,
            color: colorInput.value,
            size: parseInt(sizeInput.value, 10),
        });

        if (error) console.error("Stroke save failed:", error);

        currentStroke = [];
    }

    canvas.onpointerdown = startDraw;
    canvas.onpointermove = drawMove;
    canvas.onpointerup = endDraw;
    canvas.onpointerleave = endDraw;
    canvas.onpointercancel = endDraw;

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

                if (s.user_id === currentUserId) return;

                const pts = s.points;

                for (let i = 1; i < pts.length; i++) {
                    drawLocalLine(
                        pts[i - 1].x,
                        pts[i - 1].y,
                        pts[i].x,
                        pts[i].y,
                        s.color,
                        s.size
                    );
                }
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

        data.forEach((stroke) => {
            const pts = stroke.points;

            for (let i = 1; i < pts.length; i++) {
                drawLocalLine(
                    pts[i - 1].x,
                    pts[i - 1].y,
                    pts[i].x,
                    pts[i].y,
                    stroke.color,
                    stroke.size
                );
            }
        });
    }

    await loadHistory();
}