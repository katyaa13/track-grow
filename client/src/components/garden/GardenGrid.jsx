import { useEffect, useRef, useState } from "react";
import { useGarden } from "../../hooks/useGarden.js";
import ErrorMessage from "../ui/ErrorMessage.jsx";
import styles from "./GardenGrid.module.css";
import PlantCard from "./PlantCard.jsx";

const PLANT_SLOT_WIDTH = 125;
const GAP = 24;

function calcPlantsPerShelf(containerWidth) {
  return Math.max(1, Math.floor((containerWidth + GAP) / (PLANT_SLOT_WIDTH + GAP)));
}

export default function GardenGrid() {
  const { garden, load } = useGarden();
  const containerRef = useRef(null);
  const [plantsPerShelf, setPlantsPerShelf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load()
      .catch(() => setError("Failed to load garden"))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!containerRef.current) return;
    const initial = containerRef.current.getBoundingClientRect().width;
    if (initial > 0) setPlantsPerShelf(calcPlantsPerShelf(initial));
    const observer = new ResizeObserver(([entry]) => {
      setPlantsPerShelf(calcPlantsPerShelf(entry.contentRect.width));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (loading) {
    return (
      <>
        <div ref={containerRef} style={{ width: "100%" }} />
        <div className={styles.empty}></div>
      </>
    );
  }

  if (error) {
    return (
      <div className={styles.empty}>
        <ErrorMessage>{error}</ErrorMessage>
      </div>
    );
  }

  if (garden.length === 0) {
    return <div className={styles.empty}>Your garden is empty. Start creating habits to grow plants! 🪴</div>;
  }

  if (plantsPerShelf === null) {
    return <div ref={containerRef} className={styles.garden} style={{ visibility: "hidden" }} />;
  }

  const items = [];
  for (let i = 0; i < garden.length; i++) {
    items.push({ type: "plant", data: garden[i] });
    const isLastOnShelf = (i + 1) % plantsPerShelf === 0;
    const isLast = i === garden.length - 1;
    if (isLastOnShelf || isLast) {
      items.push({ type: "board", key: `board-${i}` });
    }
  }

  return (
    <div className={styles.garden} ref={containerRef}>
      {items.map((item) =>
        item.type === "plant" ? (
          <PlantCard key={item.data.id} plant={item.data} />
        ) : (
          <div key={item.key} className={styles.shelfBoard} />
        ),
      )}
    </div>
  );
}
