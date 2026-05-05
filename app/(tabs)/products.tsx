import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/services/api";

const COLORS = {
  cream: "#F7EEDC",
  brown: "#5A3825",
  gold: "#B8894A",
  dark: "#2B1A12",
  white: "#FFFFFF",
  card: "#FFF9EF",
};

const CATEGORIES = ["COOKIE", "PASTA", "DESSERT", "DRINK"];

export default function ProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/products");
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.log("PRODUCTS ERROR:", err?.response?.data || err.message);
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openProduct = (product: any) => {
    setSelected({
      ...product,
      variants:
        product.variants?.map((v: any) => ({
          id: v.id, // ✅ important
          label: v.label,
          price: String(v.price),
        })) || [],
    });

    setModalVisible(true);
  };

  const updateVariant = (index: number, field: string, value: string) => {
    setSelected((prev: any) => {
      const variants = [...prev.variants];
      variants[index] = {
        ...variants[index],
        [field]: value,
      };

      return {
        ...prev,
        variants,
      };
    });
  };

  const addVariant = () => {
    setSelected((prev: any) => ({
      ...prev,
      variants: [...(prev.variants || []), { label: "", price: "0" }],
    }));
  };

  const removeVariant = (index: number) => {
    setSelected((prev: any) => ({
      ...prev,
      variants: prev.variants.filter((_: any, i: number) => i !== index),
    }));
  };

  const updateProduct = async () => {
    if (!selected?.id) return;

    if (!selected.name || !selected.category) {
      Alert.alert("Missing details", "Product name and category are required.");
      return;
    }

    if (!selected.variants || selected.variants.length === 0) {
      Alert.alert("Missing variants", "Please add at least one variant.");
      return;
    }

    try {
      await api.patch(`/products/${selected.id}`, {
        name: selected.name,
        category: selected.category,
        variants: selected.variants.map((v: any) => ({
          id: v.id,
          label: v.label,
          price: Number(v.price || 0),
        })),
      });

      setModalVisible(false);
      fetchProducts();
    } catch (err: any) {
      console.log("UPDATE PRODUCT ERROR:", err?.response?.data || err.message);
      Alert.alert("Error", "Failed to update product.");
    }
  };

  const deleteProduct = (id: string) => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to delete this product?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/products/${id}`);
              setModalVisible(false);
              fetchProducts();
            } catch (err: any) {
              console.log(
                "DELETE PRODUCT ERROR:",
                err?.response?.data || err.message,
              );
              Alert.alert("Error", "Failed to delete product.");
            }
          },
        },
      ],
    );
  };

  const renderProduct = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => openProduct(item)}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.category}>{item.category}</Text>
        </View>

        <Ionicons name="chevron-forward" size={22} color={COLORS.gold} />
      </View>

      <View style={styles.variantBox}>
        {item.variants?.length > 0 ? (
          item.variants.map((variant: any) => (
            <Text key={variant.id} style={styles.variantText}>
              • {variant.label} — ₱{formatMoney(variant.price)}
            </Text>
          ))
        ) : (
          <Text style={styles.emptyText}>No variants.</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Products</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchProducts} />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>No products found.</Text>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ width: "100%" }}
            >
              <View style={styles.modalBox}>
                {/* SCROLLABLE CONTENT */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 120 }}
                >
                  <Text style={styles.modalTitle}>Edit Product</Text>

                  <TextInput
                    value={selected?.name || ""}
                    onChangeText={(text) =>
                      setSelected((prev: any) => ({ ...prev, name: text }))
                    }
                    placeholder="Product name"
                    style={styles.input}
                  />

                  <Text style={styles.sectionTitle}>Category</Text>

                  <View style={styles.categoryWrap}>
                    {CATEGORIES.map((category) => (
                      <TouchableOpacity
                        key={category}
                        onPress={() =>
                          setSelected((prev: any) => ({ ...prev, category }))
                        }
                        style={[
                          styles.categoryPill,
                          selected?.category === category &&
                            styles.categoryPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            selected?.category === category &&
                              styles.categoryTextActive,
                          ]}
                        >
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.sectionTitle}>Variants</Text>

                  {selected?.variants?.map((variant: any, index: number) => (
                    <View key={index} style={styles.variantEditBox}>
                      <TextInput
                        value={variant.label}
                        onChangeText={(text) =>
                          updateVariant(index, "label", text)
                        }
                        placeholder="Variant label"
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      />

                      <TextInput
                        value={variant.price}
                        onChangeText={(text) =>
                          updateVariant(
                            index,
                            "price",
                            text.replace(/[^0-9]/g, ""),
                          )
                        }
                        placeholder="Price"
                        keyboardType="numeric"
                        style={[styles.priceInput, { marginBottom: 0 }]}
                      />

                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeVariant(index)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={COLORS.white}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addBtn} onPress={addVariant}>
                    <Ionicons name="add" size={18} color={COLORS.white} />
                    <Text style={styles.btnText}>Add Variant</Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* 🔥 FIXED FOOTER */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.saveBtn, { flex: 1 }]}
                    onPress={updateProduct}
                  >
                    <Text style={styles.btnText}>Save</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.deleteBtn, { flex: 1 }]}
                    onPress={() => deleteProduct(selected.id)}
                  >
                    <Text style={styles.btnText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelText}>Close</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("en-PH");
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.cream,
    padding: 18,
    paddingTop: 56,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.dark,
  },
  category: {
    color: COLORS.gold,
    fontWeight: "900",
    marginTop: 4,
  },
  variantBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#ECDDC3",
  },
  variantText: {
    color: COLORS.dark,
    fontWeight: "700",
    marginTop: 4,
  },
  emptyText: {
    color: "#8A7B6A",
    fontWeight: "700",
  },
  error: {
    color: "red",
    fontWeight: "800",
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "center",
    padding: 18,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 14,
  },
  input: {
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  priceInput: {
    width: 80,
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 14,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#ECDDC3",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.brown,
    marginTop: 12,
    marginBottom: 10,
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryPill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  categoryPillActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  categoryText: {
    fontWeight: "900",
    color: COLORS.brown,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  variantEditBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  removeBtn: {
    backgroundColor: "#B3261E",
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    backgroundColor: COLORS.brown,
    padding: 14,
    borderRadius: 16,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  saveBtn: {
    backgroundColor: COLORS.gold,
    padding: 15,
    borderRadius: 16,
    marginTop: 14,
    alignItems: "center",
  },
  deleteBtn: {
    backgroundColor: "#B3261E",
    padding: 15,
    borderRadius: 16,
    marginTop: 10,
    alignItems: "center",
  },
  cancelBtn: {
    padding: 15,
    alignItems: "center",
  },
  btnText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  cancelText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  modalBox: {
    backgroundColor: COLORS.cream,
    borderRadius: 24,
    padding: 16,
    maxHeight: "85%",
  },

  modalFooter: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#ECDDC3",
    paddingTop: 10,
    marginTop: 10,
  },
});
