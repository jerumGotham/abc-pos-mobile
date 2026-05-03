import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  cream: "#F7EEDC",
  card: "#FFF9EE",
  brown: "#5A3825",
  lightBrown: "#A9745B",
  gold: "#B8894A",
  dark: "#2B1A12",
  white: "#FFFFFF",
};

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<any>(null);

  const loadDashboard = async () => {
    const res = await api.get("/dashboard");
    setDashboard(res.data);
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, []),
  );

  const productsSold = dashboard?.productsSold || {};
  const maxQty = Math.max(...Object.values(productsSold).map(Number), 1);

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={loadDashboard} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.brand}>Antigua’s</Text>
        <Text style={styles.subtitle}>Bake & Cuisine POS</Text>
      </View>

      <Text style={styles.title}>Today’s Overview</Text>

      <View style={styles.grid}>
        <Card
          icon="cash-outline"
          label="Sales Today"
          value={`₱${formatMoney(dashboard?.todaySales || 0)}`}
        />
        <Card
          icon="receipt-outline"
          label="Orders Today"
          value={dashboard?.todayOrders || 0}
        />
      </View>

      <View style={styles.grid}>
        <Card
          icon="fast-food-outline"
          label="Products"
          value={dashboard?.totalProducts || 0}
        />
        <Card
          icon="people-outline"
          label="Customers"
          value={dashboard?.totalCustomers || 0}
        />
      </View>

      <View style={styles.wideCard}>
        <Text style={styles.cardTitle}>Best Seller</Text>
        <Text style={styles.bestSeller}>
          {dashboard?.bestSeller || "No sales yet"}
        </Text>
      </View>

      <View style={styles.wideCard}>
        <Text style={styles.cardTitle}>Sales Graph</Text>

        {Object.keys(productsSold).length > 0 ? (
          Object.entries(productsSold).map(([name, qty]: any) => {
            const width = `${(Number(qty) / maxQty) * 100}%`;

            return (
              <View key={name} style={styles.graphItem}>
                <View style={styles.graphHeader}>
                  <Text style={styles.graphName}>{name}</Text>
                  <Text style={styles.graphQty}>{qty}</Text>
                </View>

                <View style={styles.graphTrack}>
                  <View style={[styles.graphBar, { width: width as any }]} />
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.empty}>No product sales yet today.</Text>
        )}
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

function Card({ icon, label, value }: any) {
  return (
    <View style={styles.card}>
      <Ionicons name={icon} size={28} color={COLORS.gold} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.cream,
    padding: 18,
    paddingTop: 56,
  },
  header: {
    backgroundColor: COLORS.dark,
    padding: 22,
    borderRadius: 26,
  },
  brand: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.white,
  },
  subtitle: {
    color: "#D7C2A7",
    marginTop: 4,
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.brown,
    marginTop: 24,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  label: {
    marginTop: 12,
    color: "#8A7B6A",
    fontWeight: "800",
  },
  value: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.dark,
  },
  wideCard: {
    backgroundColor: COLORS.card,
    padding: 18,
    borderRadius: 22,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 12,
  },
  bestSeller: {
    fontSize: 18,
    color: COLORS.dark,
    fontWeight: "900",
  },
  graphItem: {
    marginBottom: 14,
  },
  graphHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  graphName: {
    flex: 1,
    color: COLORS.dark,
    fontWeight: "800",
  },
  graphQty: {
    color: COLORS.gold,
    fontWeight: "900",
  },
  graphTrack: {
    height: 14,
    backgroundColor: "#F6EAD7",
    borderRadius: 999,
    overflow: "hidden",
  },
  graphBar: {
    height: "100%",
    backgroundColor: COLORS.gold,
    borderRadius: 999,
  },
  empty: {
    color: COLORS.lightBrown,
    fontWeight: "800",
  },
});
