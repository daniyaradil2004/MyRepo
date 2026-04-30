package models

import (
	"context"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type RecommendationRepository struct {
	driver neo4j.DriverWithContext
}

func NewRecommendationRepository(driver neo4j.DriverWithContext) *RecommendationRepository {
	return &RecommendationRepository{driver: driver}
}

// AddPurchase creates/updates PURCHASED relationship between user and product
// quantity is the number of items purchased in this order
func (r *RecommendationRepository) AddPurchase(ctx context.Context, userID primitive.ObjectID, productID primitive.ObjectID, quantity int) error {
	uid := userID.Hex()
	pid := productID.Hex()

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
		MERGE (u:User {id: $uid})
		MERGE (p:Product {id: $pid})
		MERGE (u)-[r:PURCHASED]->(p)
		ON CREATE SET r.count = $quantity
		ON MATCH SET r.count = r.count + $quantity
		`
		result, err := tx.Run(ctx, query, map[string]interface{}{
			"uid":      uid,
			"pid":      pid,
			"quantity": quantity,
		})
		if err != nil {
			return nil, err
		}
		// exhaust results (MERGE returns no meaningful rows)
		for result.Next(ctx) {
		}
		if err := result.Err(); err != nil {
			return nil, err
		}
		return nil, nil
	})

	return err
}

// AddCoOccurrences increments CO_OCCUR counts between every pair of products in a single order
func (r *RecommendationRepository) AddCoOccurrences(ctx context.Context, productIDs []primitive.ObjectID) error {
	if len(productIDs) < 2 {
		return nil
	}
	ids := make([]string, 0, len(productIDs))
	for _, id := range productIDs {
		ids = append(ids, id.Hex())
	}

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		for i := 0; i < len(ids); i++ {
			for j := i + 1; j < len(ids); j++ {
				a := ids[i]
				b := ids[j]
				query := `
				MERGE (p1:Product {id: $a})
				MERGE (p2:Product {id: $b})
				MERGE (p1)-[r:CO_OCCUR]-(p2)
				ON CREATE SET r.count = 1
				ON MATCH SET r.count = r.count + 1
				`
				result, err := tx.Run(ctx, query, map[string]interface{}{"a": a, "b": b})
				if err != nil {
					return nil, err
				}
				for result.Next(ctx) {
				}
				if err := result.Err(); err != nil {
					return nil, err
				}
			}
		}
		return nil, nil
	})

	return err
}

// GetPersonalizedRecommendations: try co-occurrence, then fallback to collaborative purchases
func (r *RecommendationRepository) GetPersonalizedRecommendations(ctx context.Context, userID primitive.ObjectID, limit int) ([]primitive.ObjectID, error) {
	uid := userID.Hex()

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
	MATCH (u:User {id:$uid})-[:PURCHASED]->(p:Product)
	MATCH (p)-[c:CO_OCCUR]-(rec:Product)
	WHERE NOT (u)-[:PURCHASED]->(rec)
	RETURN rec.id AS id, sum(c.count) AS score
	ORDER BY score DESC
	LIMIT $limit
	`

	res, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		result, err := tx.Run(ctx, query, map[string]interface{}{
			"uid":   uid,
			"limit": limit,
		})
		if err != nil {
			return nil, err
		}
		out := []primitive.ObjectID{}
		for result.Next(ctx) {
			recID, _ := result.Record().Get("id")
			if recIDStr, ok := recID.(string); ok {
				if oid, e := primitive.ObjectIDFromHex(recIDStr); e == nil {
					out = append(out, oid)
				}
			}
		}
		if err := result.Err(); err != nil {
			return nil, err
		}
		return out, nil
	})
	if err != nil {
		return nil, err
	}
	ids := res.([]primitive.ObjectID)
	if len(ids) > 0 {
		return ids, nil
	}

	// fallback: find items bought by similar users
	query2 := `
	MATCH (u:User {id:$uid})-[:PURCHASED]->(p:Product)<-[:PURCHASED]-(other:User)-[:PURCHASED]->(rec:Product)
	WHERE NOT (u)-[:PURCHASED]->(rec)
	RETURN rec.id as id, count(*) AS score
	ORDER BY score DESC
	LIMIT $limit
	`

	res2, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		result, err := tx.Run(ctx, query2, map[string]interface{}{
			"uid":   uid,
			"limit": limit,
		})
		if err != nil {
			return nil, err
		}
		out := []primitive.ObjectID{}
		for result.Next(ctx) {
			recID, _ := result.Record().Get("id")
			if recIDStr, ok := recID.(string); ok {
				if oid, e := primitive.ObjectIDFromHex(recIDStr); e == nil {
					out = append(out, oid)
				}
			}
		}
		if err := result.Err(); err != nil {
			return nil, err
		}
		return out, nil
	})
	if err != nil {
		return nil, err
	}
	return res2.([]primitive.ObjectID), nil
}

// GetCartRecommendations uses co-occurrence between items in the cart and other products
func (r *RecommendationRepository) GetCartRecommendations(ctx context.Context, cartProductIDs []primitive.ObjectID, limit int) ([]primitive.ObjectID, error) {
	if len(cartProductIDs) == 0 {
		return []primitive.ObjectID{}, nil
	}
	strIDs := make([]string, 0, len(cartProductIDs))
	for _, id := range cartProductIDs {
		strIDs = append(strIDs, id.Hex())
	}

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
	MATCH (p:Product)-[c:CO_OCCUR]-(rec:Product)
	WHERE p.id IN $ids AND NOT rec.id IN $ids
	RETURN rec.id AS id, sum(c.count) AS score
	ORDER BY score DESC
	LIMIT $limit
	`

	res, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		result, err := tx.Run(ctx, query, map[string]interface{}{
			"ids":   strIDs,
			"limit": limit,
		})
		if err != nil {
			return nil, err
		}
		out := []primitive.ObjectID{}
		for result.Next(ctx) {
			recID, _ := result.Record().Get("id")
			if recIDStr, ok := recID.(string); ok {
				if oid, e := primitive.ObjectIDFromHex(recIDStr); e == nil {
					out = append(out, oid)
				}
			}
		}
		if err := result.Err(); err != nil {
			return nil, err
		}
		return out, nil
	})
	if err != nil {
		return nil, err
	}
	return res.([]primitive.ObjectID), nil
}

// AddReview creates/updates REVIEWED relationship between user and product (only for 5-star ratings)
func (r *RecommendationRepository) AddReview(ctx context.Context, userID primitive.ObjectID, productID primitive.ObjectID, rating float64) error {
	// Only add to Neo4j if rating is 5 stars
	if rating < 5.0 {
		return nil
	}

	uid := userID.Hex()
	pid := productID.Hex()

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
		MERGE (u:User {id: $uid})
		MERGE (p:Product {id: $pid})
		MERGE (u)-[r:REVIEWED]->(p)
		ON CREATE SET r.rating = $rating, r.count = 1
		ON MATCH SET r.rating = $rating, r.count = r.count + 1
		`
		result, err := tx.Run(ctx, query, map[string]interface{}{
			"uid":    uid,
			"pid":    pid,
			"rating": rating,
		})
		if err != nil {
			return nil, err
		}
		for result.Next(ctx) {
		}
		if err := result.Err(); err != nil {
			return nil, err
		}
		return nil, nil
	})

	return err
}

// RemoveReview removes REVIEWED relationship if rating drops below 5
func (r *RecommendationRepository) RemoveReview(ctx context.Context, userID primitive.ObjectID, productID primitive.ObjectID) error {
	uid := userID.Hex()
	pid := productID.Hex()

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
		MATCH (u:User {id: $uid})-[r:REVIEWED]->(p:Product {id: $pid})
		DELETE r
		`
		result, err := tx.Run(ctx, query, map[string]interface{}{
			"uid": uid,
			"pid": pid,
		})
		if err != nil {
			return nil, err
		}
		for result.Next(ctx) {
		}
		if err := result.Err(); err != nil {
			return nil, err
		}
		return nil, nil
	})

	return err
}

// GetMostFrequentByUser returns the most frequently ordered product by user (considering quantity)
func (r *RecommendationRepository) GetMostFrequentByUser(ctx context.Context, userID primitive.ObjectID, limit int) ([]primitive.ObjectID, error) {
	uid := userID.Hex()

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
	MATCH (u:User {id: $uid})-[r:PURCHASED]->(p:Product)
	RETURN p.id AS id, r.count AS count
	ORDER BY r.count DESC
	LIMIT $limit
	`

	res, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		result, err := tx.Run(ctx, query, map[string]interface{}{
			"uid":   uid,
			"limit": limit,
		})
		if err != nil {
			return nil, err
		}
		out := []primitive.ObjectID{}
		for result.Next(ctx) {
			recID, _ := result.Record().Get("id")
			if recIDStr, ok := recID.(string); ok {
				if oid, e := primitive.ObjectIDFromHex(recIDStr); e == nil {
					out = append(out, oid)
				}
			}
		}
		if err := result.Err(); err != nil {
			return nil, err
		}
		return out, nil
	})
	if err != nil {
		return nil, err
	}
	return res.([]primitive.ObjectID), nil
}

// GetMostFrequentGlobal returns the most frequently ordered products across all users
func (r *RecommendationRepository) GetMostFrequentGlobal(ctx context.Context, limit int) ([]primitive.ObjectID, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
	MATCH (u:User)-[r:PURCHASED]->(p:Product)
	RETURN p.id AS id, sum(r.count) AS totalCount
	ORDER BY totalCount DESC
	LIMIT $limit
	`

	res, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		result, err := tx.Run(ctx, query, map[string]interface{}{
			"limit": limit,
		})
		if err != nil {
			return nil, err
		}
		out := []primitive.ObjectID{}
		for result.Next(ctx) {
			recID, _ := result.Record().Get("id")
			if recIDStr, ok := recID.(string); ok {
				if oid, e := primitive.ObjectIDFromHex(recIDStr); e == nil {
					out = append(out, oid)
				}
			}
		}
		if err := result.Err(); err != nil {
			return nil, err
		}
		return out, nil
	})
	if err != nil {
		return nil, err
	}
	return res.([]primitive.ObjectID), nil
}

// GetReviewBasedRecommendations returns products the user has rated 5 stars
func (r *RecommendationRepository) GetReviewBasedRecommendations(ctx context.Context, userID primitive.ObjectID, limit int) ([]primitive.ObjectID, error) {
	uid := userID.Hex()

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
	MATCH (u:User {id: $uid})-[r:REVIEWED]->(p:Product)
	WHERE r.rating >= 5.0
	RETURN p.id AS id, r.count AS count
	ORDER BY r.count DESC, r.rating DESC
	LIMIT $limit
	`

	res, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		result, err := tx.Run(ctx, query, map[string]interface{}{
			"uid":   uid,
			"limit": limit,
		})
		if err != nil {
			return nil, err
		}
		out := []primitive.ObjectID{}
		for result.Next(ctx) {
			recID, _ := result.Record().Get("id")
			if recIDStr, ok := recID.(string); ok {
				if oid, e := primitive.ObjectIDFromHex(recIDStr); e == nil {
					out = append(out, oid)
				}
			}
		}
		if err := result.Err(); err != nil {
			return nil, err
		}
		return out, nil
	})
	if err != nil {
		return nil, err
	}
	return res.([]primitive.ObjectID), nil
}

// EnsureProductsExist creates Product nodes if missing
func (r *RecommendationRepository) EnsureProductsExist(ctx context.Context, productIDs []primitive.ObjectID) error {
	if len(productIDs) == 0 {
		return nil
	}
	strIDs := make([]string, 0, len(productIDs))
	for _, id := range productIDs {
		strIDs = append(strIDs, id.Hex())
	}

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		for _, pid := range strIDs {
			result, err := tx.Run(ctx, "MERGE (p:Product {id:$pid})", map[string]interface{}{"pid": pid})
			if err != nil {
				return nil, err
			}
			for result.Next(ctx) {
			}
			if err := result.Err(); err != nil {
				return nil, err
			}
		}
		return nil, nil
	})
	return err
}
